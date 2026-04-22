export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          Wi-Fi
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Нет соединения</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Приложение не смогло загрузить свежие данные. Когда сеть вернется, страница
          автоматически откроет актуальную версию.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Если часть интерфейса уже была открыта раньше, она может работать из кеша.
        </p>
      </section>
    </main>
  );
}
