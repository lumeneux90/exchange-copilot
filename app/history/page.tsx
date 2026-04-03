import { DashboardShell } from "@/components/dashboard-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RiTimeLine } from "@remixicon/react";

export default function HistoryPage() {
  return (
    <DashboardShell title="История">
      <section className="px-4 lg:px-6">
        <Empty className="min-h-[24rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiTimeLine />
            </EmptyMedia>
            <EmptyTitle>История сделок появится здесь</EmptyTitle>
            <EmptyDescription>
              Маршрут уже готов. Следующим шагом сюда можно вывести пополнения,
              покупки и продажи из портфельных транзакций.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </DashboardShell>
  );
}
