import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { stocks } from "@/src/entities/stock/model/mock";

export default function HomePage() {
  return (
    <main className="py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Xchange Copilot
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              Данные по акциям с торгов
            </p>
          </header>

          <section className="grid gap-4">
            {stocks.map((stock) => (
              <Card key={stock.ticker}>
                <CardHeader>
                  <CardTitle>{stock.name}</CardTitle>
                  <CardDescription>{stock.ticker}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-tight">
                    ${stock.price.toFixed(2)}
                  </p>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="button" variant="outline">
                    {stock.ticker}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
