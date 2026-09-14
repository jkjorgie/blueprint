// Dashboard section for business analysts: the applications they own.
export async function AnalystApps({ userId }: { userId: string }) {
  void userId;
  return (
    <section aria-labelledby="my-apps-heading" className="mt-10">
      <h2 id="my-apps-heading" className="text-xl">
        My applications
      </h2>
      <p className="mt-4 text-ink-muted">Coming soon.</p>
    </section>
  );
}
