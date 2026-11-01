import type { ExportData } from '@/components/AttendanceExport';

export type FeeSummaryInput = { game: string; amount: number; collected: number };
type Row = { game: string; students: number; paid: number; partial: number; unpaid: number; total: number; collected: number; pending: number };

const statusOf = (amt: number, col: number) => (col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial');

export const summarizeFees = (items: FeeSummaryInput[]): { rows: Row[]; grand: Row } => {
  const map = new Map<string, Row>();
  const blank = (game: string): Row => ({ game, students: 0, paid: 0, partial: 0, unpaid: 0, total: 0, collected: 0, pending: 0 });
  const grand = blank('Total');
  items.forEach(i => {
    const key = i.game || '—';
    if (!map.has(key)) map.set(key, blank(key));
    const st = statusOf(i.amount, i.collected);
    for (const r of [map.get(key)!, grand]) {
      r.students++;
      r[st]++;
      r.total += i.amount;
      r.collected += i.collected;
      r.pending += Math.max(0, i.amount - i.collected);
    }
  });
  return { rows: [...map.values()].sort((a, b) => a.game.localeCompare(b.game)), grand };
};

export const summaryExport = (items: FeeSummaryInput[]): ExportData => {
  const { rows, grand } = summarizeFees(items);
  return {
    headers: ['S.No', 'Game', 'Students', 'Paid', 'Partial', 'Unpaid', 'Total Amount (₹)', 'Collected (₹)', 'Pending (₹)'],
    rows: [
      ...rows.map((r, i) => [i + 1, r.game, r.students, r.paid, r.partial, r.unpaid, r.total, r.collected, r.pending]),
      ['', 'Total', grand.students, grand.paid, grand.partial, grand.unpaid, grand.total, grand.collected, grand.pending],
    ],
  };
};

export const FeeGameSummary = ({ items }: { items: FeeSummaryInput[] }) => {
  const { rows, grand } = summarizeFees(items);
  if (rows.length === 0) return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No fee data for this month.</div>;
  const cells = (r: Row) => (
    <>
      <td className="p-3">{r.students}</td>
      <td className="p-3 text-success font-medium">{r.paid}</td>
      <td className="p-3 text-warning font-medium">{r.partial}</td>
      <td className="p-3 text-destructive font-medium">{r.unpaid}</td>
      <td className="p-3">₹{r.total.toLocaleString()}</td>
      <td className="p-3 text-success">₹{r.collected.toLocaleString()}</td>
      <td className="p-3 text-destructive">₹{r.pending.toLocaleString()}</td>
    </>
  );
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {['S.No', 'Game', 'Students', 'Paid', 'Partial', 'Unpaid', 'Total Amount', 'Collected', 'Pending'].map(h => (
              <th key={h} className="text-left p-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.game} className="border-t"><td className="p-3">{i + 1}</td><td className="p-3 font-medium">{r.game}</td>{cells(r)}</tr>
          ))}
          <tr className="border-t bg-muted/50 font-bold"><td className="p-3" /><td className="p-3">Total</td>{cells(grand)}</tr>
        </tbody>
      </table>
    </div>
  );
};

export const FeeTabs = ({ tabs, value, onChange }: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
    {tabs.map(t => (
      <button
        key={t.value}
        type="button"
        onClick={() => onChange(t.value)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${value === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
      >{t.label}</button>
    ))}
  </div>
);
