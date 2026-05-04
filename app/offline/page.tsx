export default function OfflinePage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-10">
      <section className="border-border bg-card w-full max-w-md rounded-3xl border p-8 shadow-sm">
        <div className="bg-primary/12 text-primary mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
          Wi-Fi
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Нет соединения
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Приложение не смогло загрузить свежие данные. Когда сеть вернется,
          страница автоматически откроет актуальную версию.
        </p>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          Если часть интерфейса уже была открыта раньше, она может работать из
          кеша.
        </p>
      </section>
    </main>
  );
}
