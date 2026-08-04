import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const RESEND_API_KEY = (Deno as any).env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = await req.json();
    const { type, to, data } = body as {
      type: "payment_receipt" | "subscription_confirmation" | "download_links";
      to: string;
      data: Record<string, unknown>;
    };

    if (!type || !to) {
      throw new Error("Missing required fields: type, to");
    }

    let subject = "";
    let html = "";

    if (type === "payment_receipt") {
      const {
        receiptNumber,
        planLabel,
        periodLabel,
        amount,
        currency,
        paidAt,
        renewalDate,
        downloadLimit,
      } = data as {
        receiptNumber: string;
        planLabel: string;
        periodLabel: string;
        amount: number;
        currency: string;
        paidAt: string;
        renewalDate: string;
        downloadLimit: number;
      };

      subject = `✅ إيصال الدفع ${receiptNumber} — DzExams`;
      html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إيصال الدفع</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🎓 DzExams</h1>
              <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">منصة الامتحانات الجزائرية</p>
            </td>
          </tr>
          <!-- Success Badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#dcfce7;border:2px solid #86efac;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;text-align:center;">✅</div>
              <h2 style="color:#111827;font-size:20px;margin:16px 0 4px;">تم الدفع بنجاح!</h2>
              <p style="color:#6b7280;font-size:14px;margin:0;">Paiement confirmé — شكراً لاشتراكك في DzExams</p>
            </td>
          </tr>
          <!-- Receipt Details -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
                  <td style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:12px;color:#6b7280;">الاشتراك المفعّل</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827;">
                            👑 ${planLabel} <span style="font-size:13px;font-weight:400;color:#6b7280;">(${periodLabel})</span>
                          </p>
                        </td>
                        <td align="left">
                          <span style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;">نشط ✓</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;">🧾 رقم الإيصال</td>
                        <td align="left" style="font-family:monospace;font-size:13px;font-weight:700;color:#111827;background:#f3f4f6;padding:4px 10px;border-radius:6px;">${receiptNumber}</td>
                      </tr>
                      <tr style="border-top:1px solid #f3f4f6;">
                        <td style="color:#6b7280;font-size:13px;">📅 تاريخ الدفع</td>
                        <td align="left" style="font-size:13px;font-weight:500;color:#111827;">${paidAt}</td>
                      </tr>
                      <tr style="border-top:1px solid #f3f4f6;">
                        <td style="color:#6b7280;font-size:13px;">🔄 تاريخ التجديد</td>
                        <td align="left" style="font-size:13px;font-weight:500;color:#111827;">${renewalDate}</td>
                      </tr>
                      <tr style="border-top:1px solid #f3f4f6;">
                        <td style="color:#6b7280;font-size:13px;">💰 المبلغ المدفوع</td>
                        <td align="left" style="font-size:14px;font-weight:700;color:#111827;">${amount.toLocaleString()} ${currency.toUpperCase()}</td>
                      </tr>
                      <tr style="border-top:1px solid #f3f4f6;">
                        <td style="color:#6b7280;font-size:13px;">📥 حد التحميل</td>
                        <td align="left" style="font-size:13px;font-weight:600;color:#6366f1;">${downloadLimit} ملف/شهر</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Features -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">✅ المزايا المفعّلة:</p>
              <ul style="margin:0;padding:0;list-style:none;">
                <li style="padding:6px 0;font-size:13px;color:#374151;">✔️ تحميل حتى ${downloadLimit} ملف شهرياً</li>
                <li style="padding:6px 0;font-size:13px;color:#374151;">✔️ الوصول لجميع السنوات الدراسية</li>
                <li style="padding:6px 0;font-size:13px;color:#374151;">✔️ تحميل مجمّع (ZIP)</li>
                <li style="padding:6px 0;font-size:13px;color:#374151;">✔️ مساعد الذكاء الاصطناعي بدون قيود</li>
                <li style="padding:6px 0;font-size:13px;color:#374151;">✔️ أولوية في الدعم الفني</li>
              </ul>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="https://dzexamsdo9691.builtwithrocket.new/download-manager" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
                📥 ابدأ التحميل الآن
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">DzExams — منصة الامتحانات الجزائرية | هذا البريد تم إرساله تلقائياً، لا تردّ عليه.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else if (type === "subscription_confirmation") {
      const { planLabel, periodLabel, renewalDate, downloadLimit } = data as {
        planLabel: string;
        periodLabel: string;
        renewalDate: string;
        downloadLimit: number;
      };

      subject = `🎉 تم تفعيل اشتراكك ${planLabel} في DzExams`;
      html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد الاشتراك</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🎓 DzExams</h1>
              <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">منصة الامتحانات الجزائرية</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">🎉</div>
              <h2 style="color:#111827;font-size:22px;margin:0 0 8px;">مرحباً بك في خطة ${planLabel}!</h2>
              <p style="color:#6b7280;font-size:14px;margin:0;">اشتراكك ${planLabel} (${periodLabel}) مفعّل الآن ويجدد بتاريخ <strong>${renewalDate}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;padding:20px;border:1px solid #ddd6fe;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;font-size:32px;font-weight:800;color:#6366f1;">${downloadLimit}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">ملف/شهر مفتوح للتحميل</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="https://dzexamsdo9691.builtwithrocket.new" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
                🚀 ابدأ الاستخدام
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">DzExams — منصة الامتحانات الجزائرية | هذا البريد تم إرساله تلقائياً.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else if (type === "download_links") {
      const { files } = data as {
        files: Array<{ name: string; url: string; subject?: string; year?: string }>;
      };

      const fileRows = files
        .map(
          (f) => `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:10px 16px;font-size:13px;color:#374151;">
            📄 ${f.name}${f.year ? ` — ${f.year}` : ""}${f.subject ? ` / ${f.subject}` : ""}
          </td>
          <td align="left" style="padding:10px 16px;">
            <a href="${f.url}" style="color:#6366f1;font-size:13px;font-weight:600;text-decoration:none;">تحميل ↗</a>
          </td>
        </tr>`
        )
        .join("");

      subject = `📥 روابط تحميل ملفاتك — DzExams`;
      html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>روابط التحميل</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🎓 DzExams</h1>
              <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">منصة الامتحانات الجزائرية</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 16px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">📥</div>
              <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">روابط تحميل ملفاتك</h2>
              <p style="color:#6b7280;font-size:14px;margin:0;">إليك الروابط المباشرة للملفات التي طلبتها</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;">اسم الملف</td>
                  <td align="left" style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;">رابط التحميل</td>
                </tr>
                ${fileRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="https://dzexamsdo9691.builtwithrocket.new/download-manager" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
                📂 مدير التحميلات
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">DzExams — منصة الامتحانات الجزائرية | هذا البريد تم إرساله تلقائياً.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      throw new Error(`Resend API error ${resendResponse.status}: ${errBody}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
