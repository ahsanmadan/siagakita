"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-state";
import { getCurrentProfile } from "@/lib/auth";
import type { AttachmentVisibility, OperationalAttachment } from "@/lib/types";
import { writeAuditLog } from "@/lib/actions/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const visibilityValues: [AttachmentVisibility, ...AttachmentVisibility[]] = [
  "internal",
  "public_safe",
  "restricted",
  "private",
];

const registerAttachmentSchema = z.object({
  module: z.string().min(2, "Modul wajib diisi."),
  entityType: z.string().min(2, "Tipe entitas wajib diisi."),
  entityId: z.string().uuid("ID entitas tidak valid."),
  filePath: z.string().min(3, "Path berkas wajib diisi."),
  fileBucket: z.string().default("operational_evidence"),
  originalFileName: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileSize: z.coerce.number().optional().nullable(),
  visibility: z.enum(visibilityValues).default("internal"),
  description: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function mapAttachmentRow(data: Record<string, any>): OperationalAttachment {
  return {
    id: data.id,
    module: data.module,
    entityType: data.entity_type,
    entityId: data.entity_id,
    fileBucket: data.file_bucket,
    filePath: data.file_path,
    originalFileName: data.original_file_name,
    mimeType: data.mime_type,
    fileSize: data.file_size ? Number(data.file_size) : null,
    visibility: data.visibility as AttachmentVisibility,
    description: data.description,
    caption: data.caption,
    metadata: (data.metadata || {}) as Record<string, unknown>,
    uploadedBy: data.uploaded_by,
    uploadedAt: data.uploaded_at || data.created_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function registerAttachmentAction(
  input: z.infer<typeof registerAttachmentSchema>
): Promise<ActionResult & { attachment?: OperationalAttachment }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid. Harap login kembali." };
    }

    const parsed = registerAttachmentSchema.parse(input);
    const isOps = profile.role === "admin" || profile.role === "bpbd_operator";

    // Non-ops users are not allowed to directly publish files as public_safe
    if (parsed.visibility === "public_safe" && !isOps) {
      return {
        ok: false,
        message: "Hanya Admin dan Operator BPBD yang berwenang menetapkan berkas bukti sebagai public_safe.",
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("operational_attachments")
      .insert({
        module: parsed.module,
        entity_type: parsed.entityType,
        entity_id: parsed.entityId,
        file_bucket: parsed.fileBucket,
        file_path: parsed.filePath,
        original_file_name: parsed.originalFileName || null,
        mime_type: parsed.mimeType || null,
        file_size: parsed.fileSize ? Number(parsed.fileSize) : null,
        visibility: parsed.visibility,
        description: parsed.description || null,
        caption: parsed.caption || null,
        metadata: (parsed.metadata || {}) as any,
        uploaded_by: profile.id,
        uploaded_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, message: `Gagal menyimpan lampiran: ${error.message}` };
    }

    const attachment = mapAttachmentRow(data);

    // Audit log: strictly metadata, no full sensitive payload
    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.uploaded",
      targetTable: data.entity_type,
      targetId: data.entity_id,
      afterData: {
        attachment_id: data.id,
        module: data.module,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        original_file_name: data.original_file_name,
        file_path: data.file_path,
        file_bucket: data.file_bucket,
        mime_type: data.mime_type,
        file_size: data.file_size,
        visibility: data.visibility,
        uploaded_by: profile.id,
      },
    });

    revalidatePath("/laporan");
    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return {
      ok: true,
      message: "Berkas bukti berhasil dilampirkan.",
      attachment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mencatat lampiran.";
    return { ok: false, message: msg };
  }
}

export async function replaceAttachmentAction(
  attachmentId: string,
  input: {
    filePath: string;
    originalFileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    description?: string | null;
    caption?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<ActionResult & { attachment?: OperationalAttachment }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: before, error: fetchErr } = await supabase
      .from("operational_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (fetchErr || !before) {
      return { ok: false, message: "Lampiran tidak ditemukan." };
    }

    const isOps = profile.role === "admin" || profile.role === "bpbd_operator";
    if (!isOps) {
      return { ok: false, message: "Hanya Admin dan Operator BPBD yang berwenang mengganti berkas lampiran ini." };
    }

    const updatePayload: Record<string, any> = {
      file_path: input.filePath,
      updated_at: new Date().toISOString(),
    };
    if (input.originalFileName !== undefined) updatePayload.original_file_name = input.originalFileName;
    if (input.mimeType !== undefined) updatePayload.mime_type = input.mimeType;
    if (input.fileSize !== undefined) updatePayload.file_size = input.fileSize;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.caption !== undefined) updatePayload.caption = input.caption;
    if (input.metadata !== undefined) updatePayload.metadata = input.metadata;

    const { data: updated, error: updateErr } = await supabase
      .from("operational_attachments")
      .update(updatePayload)
      .eq("id", attachmentId)
      .select("*")
      .single();

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    const attachment = mapAttachmentRow(updated);

    // Audit log: strictly metadata
    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.replaced",
      targetTable: before.entity_type,
      targetId: before.entity_id,
      beforeData: {
        attachment_id: before.id,
        entity_type: before.entity_type,
        entity_id: before.entity_id,
        file_path: before.file_path,
        original_file_name: before.original_file_name,
        mime_type: before.mime_type,
        visibility: before.visibility,
        uploaded_by: before.uploaded_by,
      },
      afterData: {
        attachment_id: updated.id,
        entity_type: updated.entity_type,
        entity_id: updated.entity_id,
        file_path: updated.file_path,
        original_file_name: updated.original_file_name,
        mime_type: updated.mime_type,
        visibility: updated.visibility,
        uploaded_by: profile.id,
      },
    });

    revalidatePath("/laporan");
    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return {
      ok: true,
      message: "Berkas lampiran berhasil diperbarui.",
      attachment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui berkas lampiran.";
    return { ok: false, message: msg };
  }
}

export async function updateAttachmentMetadataAction(input: {
  attachmentId: string;
  description?: string | null;
  caption?: string | null;
}): Promise<ActionResult & { attachment?: OperationalAttachment }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: before, error: fetchErr } = await supabase
      .from("operational_attachments")
      .select("*")
      .eq("id", input.attachmentId)
      .single();

    if (fetchErr || !before) {
      return { ok: false, message: "Lampiran tidak ditemukan." };
    }

    const isOps = profile.role === "admin" || profile.role === "bpbd_operator";
    if (!isOps && before.uploaded_by !== profile.id) {
      return { ok: false, message: "Anda tidak memiliki izin mengubah keterangan lampiran ini." };
    }

    // Call safe RPC to update only harmless metadata (description, caption)
    const { data: rpcData, error: rpcErr } = await supabase.rpc("update_attachment_metadata", {
      target_attachment_id: input.attachmentId,
      new_description: input.description !== undefined ? input.description : before.description,
      new_caption: input.caption !== undefined ? input.caption : before.caption,
    });

    if (rpcErr) {
      return { ok: false, message: `Gagal memperbarui keterangan: ${rpcErr.message}` };
    }

    const attachment = rpcData ? mapAttachmentRow(rpcData) : undefined;

    // Audit log: strictly metadata, no raw sensitive contents
    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.metadata_updated",
      targetTable: before.entity_type,
      targetId: before.entity_id,
      beforeData: {
        attachment_id: before.id,
        entity_type: before.entity_type,
        entity_id: before.entity_id,
        description: before.description,
        caption: before.caption,
      },
      afterData: {
        attachment_id: before.id,
        entity_type: before.entity_type,
        entity_id: before.entity_id,
        description: input.description !== undefined ? input.description : before.description,
        caption: input.caption !== undefined ? input.caption : before.caption,
        updated_by: profile.id,
      },
    });

    revalidatePath("/laporan");
    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return {
      ok: true,
      message: "Keterangan lampiran berhasil diperbarui.",
      attachment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui keterangan berkas.";
    return { ok: false, message: msg };
  }
}

export async function updateAttachmentVisibilityAction(
  attachmentId: string,
  newVisibility: AttachmentVisibility
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: before, error: fetchErr } = await supabase
      .from("operational_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (fetchErr || !before) {
      return { ok: false, message: "Lampiran tidak ditemukan." };
    }

    const isOps = profile.role === "admin" || profile.role === "bpbd_operator";
    if (!isOps) {
      return { ok: false, message: "Hanya Admin dan Operator BPBD yang berwenang mengubah status visibilitas lampiran ini." };
    }

    const { data: updated, error: updateErr } = await supabase
      .from("operational_attachments")
      .update({
        visibility: newVisibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attachmentId)
      .select("*")
      .single();

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Audit log: strictly metadata
    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.visibility_changed",
      targetTable: "operational_attachments",
      targetId: attachmentId,
      beforeData: {
        attachment_id: before.id,
        module: before.module,
        entity_type: before.entity_type,
        entity_id: before.entity_id,
        visibility: before.visibility,
      },
      afterData: {
        attachment_id: updated.id,
        module: updated.module,
        entity_type: updated.entity_type,
        entity_id: updated.entity_id,
        visibility: updated.visibility,
      },
    });

    revalidatePath("/laporan");
    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return { ok: true, message: `Visibilitas lampiran diperbarui ke ${newVisibility}.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui visibilitas.";
    return { ok: false, message: msg };
  }
}

export async function deleteAttachmentAction(attachmentId: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid." };
    }

    const isOps = profile.role === "admin" || profile.role === "bpbd_operator";
    if (!isOps) {
      return { ok: false, message: "Hanya Admin dan Operator BPBD yang berwenang menghapus berkas bukti." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: before, error: fetchErr } = await supabase
      .from("operational_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (fetchErr || !before) {
      return { ok: false, message: "Lampiran tidak ditemukan." };
    }

    const { error: delErr } = await supabase
      .from("operational_attachments")
      .delete()
      .eq("id", attachmentId);

    if (delErr) {
      return { ok: false, message: delErr.message };
    }

    // Audit log: strictly metadata
    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.deleted",
      targetTable: before.entity_type,
      targetId: before.entity_id,
      beforeData: {
        attachment_id: before.id,
        module: before.module,
        entity_type: before.entity_type,
        entity_id: before.entity_id,
        original_file_name: before.original_file_name,
        file_path: before.file_path,
        visibility: before.visibility,
        uploaded_by: before.uploaded_by,
      },
    });

    revalidatePath("/laporan");
    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return { ok: true, message: "Lampiran berhasil dihapus." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus berkas bukti.";
    return { ok: false, message: msg };
  }
}

export async function attachProofOfDeliveryFileAction(input: {
  podId: string;
  distributionCode: string;
  filePath: string;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  description?: string | null;
}): Promise<ActionResult & { attachmentId?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid." };
    }

    const supabase = await createSupabaseServerClient();

    // Verify proof of delivery exists
    const { data: pod, error: podErr } = await supabase
      .from("proof_of_delivery")
      .select("id, distribution_id, shelter_id")
      .eq("id", input.podId)
      .single();

    if (podErr || !pod) {
      return { ok: false, message: "Data tanda terima distribusi tidak ditemukan." };
    }

    const { data: attach, error: attachErr } = await supabase
      .from("operational_attachments")
      .insert({
        module: "deliveries",
        entity_type: "proof_of_delivery",
        entity_id: pod.id,
        file_bucket: "operational_evidence",
        file_path: input.filePath,
        original_file_name: input.originalFileName || input.filePath.split("/").pop() || "bukti-penerimaan.jpg",
        mime_type: input.mimeType || "image/jpeg",
        file_size: input.fileSize ? Number(input.fileSize) : null,
        visibility: "internal",
        description: input.description || `Dokumen tanda terima distribusi ${input.distributionCode}`,
        uploaded_by: profile.id,
        uploaded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attachErr || !attach) {
      return { ok: false, message: `Gagal mencatat lampiran tanda terima: ${attachErr?.message || "Unknown error"}` };
    }

    await supabase
      .from("proof_of_delivery")
      .update({
        attachment_id: attach.id,
        proof_path: input.filePath,
      })
      .eq("id", pod.id);

    await writeAuditLog({
      actorId: profile.id,
      action: "attachment.proof_attached",
      targetTable: "proof_of_delivery",
      targetId: pod.id,
      afterData: {
        attachment_id: attach.id,
        distribution_code: input.distributionCode,
        file_path: input.filePath,
        visibility: "internal",
        uploaded_by: profile.id,
      },
    });

    revalidatePath("/logistik");
    revalidatePath("/posko");
    revalidatePath("/audit-log");

    return {
      ok: true,
      message: "Dokumen tanda terima berhasil ditautkan ke sistem lampiran.",
      attachmentId: attach.id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menautkan dokumen tanda terima.";
    return { ok: false, message: msg };
  }
}

export async function getSignedAttachmentUrl(
  attachmentId: string,
  expiresInSeconds = 3600
): Promise<{ ok: boolean; signedUrl?: string; isPublic?: boolean; message?: string }> {
  try {
    const profile = await getCurrentProfile();
    const supabase = await createSupabaseServerClient();

    const { data: attachment, error } = await supabase
      .from("operational_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (error || !attachment) {
      return { ok: false, message: "Berkas lampiran tidak ditemukan atau akses ditolak." };
    }

    // If public_safe, construct signed url (safe for private bucket) or fallback to public url
    if (attachment.visibility === "public_safe") {
      const { data: signedData } = await supabase.storage
        .from(attachment.file_bucket)
        .createSignedUrl(attachment.file_path, expiresInSeconds);

      if (signedData?.signedUrl) {
        return {
          ok: true,
          signedUrl: signedData.signedUrl,
          isPublic: true,
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from(attachment.file_bucket)
        .getPublicUrl(attachment.file_path);

      return {
        ok: true,
        signedUrl: publicUrlData?.publicUrl || "",
        isPublic: true,
      };
    }

    // Sensitive / internal files require active authentication
    if (!profile) {
      return { ok: false, message: "Sesi tidak valid untuk berkas internal." };
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(attachment.file_bucket)
      .createSignedUrl(attachment.file_path, expiresInSeconds);

    if (signError || !signedData?.signedUrl) {
      return { ok: false, message: signError?.message || "Gagal membuat URL akses berkas." };
    }

    return { ok: true, signedUrl: signedData.signedUrl, isPublic: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mendapatkan URL lampiran.";
    return { ok: false, message: msg };
  }
}
