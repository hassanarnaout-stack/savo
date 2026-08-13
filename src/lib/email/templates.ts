/**
 * Email Templates — Phase 5.1
 *
 * Plain functions returning { subject, html } — no template engine
 * dependency, so this works with zero extra packages. Table-based HTML
 * for broad email-client compatibility (many clients, notably Outlook,
 * don't reliably support modern CSS/flexbox in email).
 */

export type EmailLocale = "en" | "ar";

function wrapper(locale: EmailLocale, bodyHtml: string): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f0;padding:24px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0B3D2E;padding:20px 28px;">
          <span style="color:#D4AF37;font-size:20px;font-weight:800;">Save${locale === "ar" ? "o" : "o"}</span>
        </td></tr>
        <tr><td style="padding:28px;text-align:${align};color:#0B3D2E;font-size:14px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9f9f7;text-align:${align};color:#0B3D2E80;font-size:11px;">
          ${locale === "ar" ? "سافيو — منصة التوفير الذكي بالكويت" : "Saveo — Kuwait's smart savings marketplace"}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(locale: EmailLocale, href: string, label: string): string {
  return `<div style="margin-top:20px;"><a href="${href}" style="background:#D4AF37;color:#0B3D2E;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">${label}</a></div>`;
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------------------

export function welcomeEmail(locale: EmailLocale, data: { name: string }) {
  const en = { subject: "Welcome to Saveo! 🎉", body: `<h2>Welcome, ${data.name}!</h2><p>Your account is ready. Start discovering real savings from verified suppliers across Kuwait.</p>${button(locale, `${siteUrl()}/en`, "Start Shopping")}` };
  const ar = { subject: "أهلاً بك في سافيو! 🎉", body: `<h2>أهلاً ${data.name}!</h2><p>حسابك جاهز الآن. ابدأ اكتشاف توفير حقيقي من موردين موثوقين بالكويت.</p>${button(locale, `${siteUrl()}/ar`, "ابدأ التسوق")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function orderConfirmationEmail(locale: EmailLocale, data: { orderNumber: string; total: number; orderId: string }) {
  const en = { subject: `Order Confirmed — ${data.orderNumber}`, body: `<h2>Thanks for your order!</h2><p>Order <strong>${data.orderNumber}</strong> has been placed — total <strong>${data.total.toFixed(3)} KD</strong>.</p>${button(locale, `${siteUrl()}/en/account/orders/${data.orderId}`, "View Order")}` };
  const ar = { subject: `تأكيد الطلب — ${data.orderNumber}`, body: `<h2>شكراً لطلبك!</h2><p>تم استلام طلبك <strong>${data.orderNumber}</strong> — الإجمالي <strong>${data.total.toFixed(3)} د.ك</strong>.</p>${button(locale, `${siteUrl()}/ar/account/orders/${data.orderId}`, "عرض الطلب")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function orderStatusChangedEmail(locale: EmailLocale, data: { orderNumber: string; newStatus: string; orderId: string }) {
  const statusLabelsEn: Record<string, string> = { ACCEPTED: "accepted by the supplier", PREPARING: "being prepared", SHIPPED: "on its way", DELIVERED: "delivered" };
  const statusLabelsAr: Record<string, string> = { ACCEPTED: "تم قبوله من المورد", PREPARING: "قيد التجهيز", SHIPPED: "بالطريق إليك", DELIVERED: "تم التسليم" };
  const en = { subject: `Order Update — ${data.orderNumber}`, body: `<h2>Your order is ${statusLabelsEn[data.newStatus] ?? data.newStatus}</h2><p>Order <strong>${data.orderNumber}</strong>.</p>${button(locale, `${siteUrl()}/en/account/orders/${data.orderId}`, "Track Order")}` };
  const ar = { subject: `تحديث الطلب — ${data.orderNumber}`, body: `<h2>طلبك ${statusLabelsAr[data.newStatus] ?? data.newStatus}</h2><p>الطلب <strong>${data.orderNumber}</strong>.</p>${button(locale, `${siteUrl()}/ar/account/orders/${data.orderId}`, "تتبع الطلب")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function membershipActivatedEmail(locale: EmailLocale, data: { planName: string; endsAt: Date }) {
  const dateStr = data.endsAt.toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB");
  const en = { subject: "Welcome to Saveo Plus! 👑", body: `<h2>You're a ${data.planName} member!</h2><p>Extra discounts, free delivery, and exclusive deals are active now. Renews on ${dateStr}.</p>${button(locale, `${siteUrl()}/en/account`, "View Membership")}` };
  const ar = { subject: "أهلاً بك في سافيو بلس! 👑", body: `<h2>أنت الآن عضو ${data.planName}!</h2><p>الخصومات الإضافية والتوصيل المجاني والعروض الحصرية مفعّلة الآن. يتجدد بتاريخ ${dateStr}.</p>${button(locale, `${siteUrl()}/ar/account`, "عرض العضوية")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

/** Template only — no password-reset flow exists yet in the app (see file header of send.ts). Ready for when one is built. */
export function passwordResetEmail(locale: EmailLocale, data: { resetUrl: string }) {
  const en = { subject: "Reset your Saveo password", body: `<h2>Reset your password</h2><p>Click below to choose a new password. This link expires in 1 hour.</p>${button(locale, data.resetUrl, "Reset Password")}<p style="margin-top:16px;font-size:12px;color:#0B3D2E80;">If you didn't request this, you can ignore this email.</p>` };
  const ar = { subject: "إعادة تعيين كلمة مرور سافيو", body: `<h2>إعادة تعيين كلمة المرور</h2><p>اضغط بالأسفل لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة.</p>${button(locale, data.resetUrl, "إعادة التعيين")}<p style="margin-top:16px;font-size:12px;color:#0B3D2E80;">لو ما طلبت هذا، تجاهل الرسالة.</p>` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

// ---------------------------------------------------------------------------
// SUPPLIER
// ---------------------------------------------------------------------------

export function supplierRegistrationReceivedEmail(locale: EmailLocale, data: { companyName: string }) {
  const en = { subject: "We've received your Saveo supplier application", body: `<h2>Thanks, ${data.companyName}!</h2><p>Your application is under review. We'll email you as soon as it's approved.</p>` };
  const ar = { subject: "استلمنا طلب انضمامك كمورد بسافيو", body: `<h2>شكراً، ${data.companyName}!</h2><p>طلبك قيد المراجعة الآن. رح نراسلك فور الموافقة.</p>` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function supplierApprovedEmail(locale: EmailLocale, data: { companyName: string }) {
  const en = { subject: "You're approved! Welcome to Saveo 🎉", body: `<h2>Welcome, ${data.companyName}!</h2><p>Your supplier account is now active. Start listing products and reaching customers across Kuwait.</p>${button(locale, `${siteUrl()}/supplier`, "Go to Dashboard")}` };
  const ar = { subject: "تمت الموافقة! أهلاً بك في سافيو 🎉", body: `<h2>أهلاً ${data.companyName}!</h2><p>حساب المورد الخاص فيك مفعّل الآن. ابدأ بإضافة منتجاتك والوصول لعملاء بالكويت.</p>${button(locale, `${siteUrl()}/supplier`, "لوحة التحكم")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function newSupplierOrderEmail(locale: EmailLocale, data: { supplierOrderNumber: string }) {
  const en = { subject: `New Order — ${data.supplierOrderNumber}`, body: `<h2>You've got a new order!</h2><p>Order <strong>${data.supplierOrderNumber}</strong> is waiting for you to accept.</p>${button(locale, `${siteUrl()}/supplier/orders`, "View Order")}` };
  const ar = { subject: `طلب جديد — ${data.supplierOrderNumber}`, body: `<h2>عندك طلب جديد!</h2><p>الطلب <strong>${data.supplierOrderNumber}</strong> بانتظار موافقتك.</p>${button(locale, `${siteUrl()}/supplier/orders`, "عرض الطلب")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

export function supplierOrderStatusUpdateEmail(locale: EmailLocale, data: { supplierOrderNumber: string; newStatus: string }) {
  const en = { subject: `Order ${data.supplierOrderNumber} — ${data.newStatus}`, body: `<h2>Status updated</h2><p>Order <strong>${data.supplierOrderNumber}</strong> is now <strong>${data.newStatus}</strong>.</p>${button(locale, `${siteUrl()}/supplier/orders`, "View Orders")}` };
  const ar = { subject: `الطلب ${data.supplierOrderNumber} — ${data.newStatus}`, body: `<h2>تحديث الحالة</h2><p>الطلب <strong>${data.supplierOrderNumber}</strong> صار <strong>${data.newStatus}</strong>.</p>${button(locale, `${siteUrl()}/supplier/orders`, "عرض الطلبات")}` };
  const t = locale === "ar" ? ar : en;
  return { subject: t.subject, html: wrapper(locale, t.body) };
}

// ---------------------------------------------------------------------------
// ADMIN — always English (internal ops tool, consistent with the rest of /admin)
// ---------------------------------------------------------------------------

export function newSupplierRequestEmail(data: { companyName: string; supplierId: string }) {
  const body = `<h2>New supplier application</h2><p><strong>${data.companyName}</strong> just applied. Review their onboarding checklist.</p>${button("en", `${siteUrl()}/admin/suppliers/${data.supplierId}`, "Review Supplier")}`;
  return { subject: `New Supplier Application — ${data.companyName}`, html: wrapper("en", body) };
}

export function productApprovalNeededEmail(data: { productName: string; supplierName: string }) {
  const body = `<h2>Product awaiting review</h2><p><strong>${data.productName}</strong> by ${data.supplierName} is pending approval.</p>${button("en", `${siteUrl()}/admin/products/pending`, "Review Queue")}`;
  return { subject: `Product Approval Needed — ${data.productName}`, html: wrapper("en", body) };
}

export function customerIssueCreatedEmail(data: { subject: string; orderNumber: string }) {
  const body = `<h2>New customer issue</h2><p><strong>${data.subject}</strong> — order ${data.orderNumber}.</p>${button("en", `${siteUrl()}/admin/support`, "View Issue")}`;
  return { subject: `Customer Issue — ${data.subject}`, html: wrapper("en", body) };
}
