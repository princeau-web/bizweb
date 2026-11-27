import DownloadButton from "./DownloadButton";

// Landing page after SasPay redirects the buyer back (return_url).
// IMPORTANT: arriving here proves NOTHING about payment. The download
// button calls /api/download, which only serves the ebook when the order
// is marked paid by the verified SasPay webhook.
export default function SuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; token?: string };
}) {
  const order = searchParams.order || "";
  const token = searchParams.token || "";

  return (
    <div className="wrap" style={{ padding: "56px 20px 70px", textAlign: "center" }}>
      <h1 style={{ fontSize: 38, margin: "0 0 12px" }}>
        Thank you! 🎉
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560, margin: "0 auto 28px" }}>
        If your payment was confirmed, your ebook is ready below. Payment confirmation can
        take a few seconds — if the button says payment is not confirmed yet, wait a moment
        and try again.
      </p>
      {order && token ? (
        <DownloadButton order={order} token={token} />
      ) : (
        <p style={{ color: "#ff8a8a" }}>
          This page is missing its access details. Please use the exact link you received
          after payment.
        </p>
      )}
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 30 }}>
        Keep this page's address private — it is your personal key to the ebook.
      </p>
    </div>
  );
}
