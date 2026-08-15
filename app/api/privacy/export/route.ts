import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
export async function GET(){const s=await requireAdmin();if(!s)return NextResponse.json({error:"Acesso restrito"},{status:403});const [organization,clients,barbers,services,appointments,payments,consents]=await Promise.all([
query("SELECT id,name,slug,status,plan,created_at FROM organizations WHERE id=$1",[s.organizationId]),
query("SELECT id,name,phone,email,cpf,notes,created_at,updated_at,anonymized_at FROM clients WHERE organization_id=$1",[s.organizationId]),
query("SELECT id,name,phone,commission_percent,active,created_at FROM barbers WHERE organization_id=$1",[s.organizationId]),
query("SELECT id,name,price_cents,duration_minutes,active,created_at FROM services WHERE organization_id=$1",[s.organizationId]),
query("SELECT id,client_id,barber_id,service_id,starts_at,ends_at,status,created_at FROM appointments WHERE organization_id=$1",[s.organizationId]),
query("SELECT id,appointment_id,amount_cents,method,paid_at FROM payments WHERE organization_id=$1",[s.organizationId]),
query("SELECT purpose,legal_basis,policy_version,source,accepted_at,revoked_at FROM privacy_consents WHERE organization_id=$1",[s.organizationId])]);
await query("INSERT INTO privacy_requests(organization_id,requested_by,request_type,details) VALUES($1,$2,'ORGANIZATION_EXPORT',$3)",[s.organizationId,s.sub,JSON.stringify({format:"json"})]);
return new NextResponse(JSON.stringify({exportedAt:new Date().toISOString(),organization:organization.rows[0],clients:clients.rows,barbers:barbers.rows,services:services.rows,appointments:appointments.rows,payments:payments.rows,consents:consents.rows},null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="navalha-lgpd-${s.organizationSlug}.json"`}})}
