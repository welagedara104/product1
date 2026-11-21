/** Payment screen — capture must stop before here and never submit. */
export default function DemoPayment() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui,sans-serif",
        background: "#12212b",
        color: "#f4efe6",
        padding: "2rem",
      }}
    >
      <h1>Payment</h1>
      <p>Card details would go here. Cranial capture never fills or submits this form.</p>
      <form style={{ maxWidth: 360, display: "grid", gap: 10 }} action="#" method="post">
        <input name="card" placeholder="Card number" disabled />
        <input name="exp" placeholder="MM/YY" disabled />
        <button type="submit" disabled>
          Pay now (disabled)
        </button>
      </form>
    </main>
  );
}
