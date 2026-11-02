import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import StudentProfile from '@/components/profiles/StudentProfile';
import TeacherProfile from '@/components/profiles/TeacherProfile';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  User,
  GraduationCap,
  Layers,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

export interface MasterResult {
  type: 'student' | 'teacher' | 'batch';
  id: string;
  name: string;
  regNo?: string;
  status?: string;
  role?: string;
  contact?: string;
  tags: string[];
}

export interface MasterNavigateTarget {
  tab: 'students' | 'teachers' | 'batches';
  id: string;
  name: string;
}

interface MasterSearchProps {
  instituteId: string | null;
  readOnly?: boolean;
  onNavigate: (target: MasterNavigateTarget) => void;
}

type Entry = MasterResult & {
  user_id?: string;
  parentName?: string;
  games: string[];
  batches: string[];
};

const norm = (s?: string | null) => (s || '').toString().toLowerCase().trim();

export default function MasterSearch({ instituteId, readOnly, onNavigate }: MasterSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const [studentsRes, teachersRes, batchesRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, reg_no, status, user_id, parent_name, parent_phone')
        .eq('institute_id', instituteId),
      supabase
        .from('teachers')
        .select('id, teacher_id, phone, role, status, user_id')
        .eq('institute_id', instituteId),
      supabase
        .from('batches')
        .select('id, name, games(name)')
        .eq('institute_id', instituteId),
    ]);

    const students = studentsRes.data || [];
    const teachers = teachersRes.data || [];
    const batches = (batchesRes.data || []) as any[];

    const userIds = [
      ...students.map((s: any) => s.user_id).filter(Boolean),
      ...teachers.map((t: any) => t.user_id).filter(Boolean),
    ];
    const uniqueUserIds = Array.from(new Set(userIds)) as string[];

    const [profilesRes, enrollmentsRes, assignmentsRes] = await Promise.all([
      uniqueUserIds.length
        ? supabase.from('profiles').select('user_id, name, email').in('user_id', uniqueUserIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('student_games')
        .select('student_id, status, games(name)')
        .eq('institute_id', instituteId),
      supabase
        .from('batch_teachers')
        .select('teacher_id, batches(name)')
        .in('teacher_id', teachers.length ? teachers.map((t: any) => t.id) : ['00000000-0000-0000-0000-000000000000']),
    ]);

    const profileMap = new Map<string, { name?: string; email?: string }>();
    (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p));

    const gamesByStudent = new Map<string, string[]>();
    (enrollmentsRes.data || []).forEach((e: any) => {
      const list = gamesByStudent.get(e.student_id) || [];
      if (e.games?.name) list.push(e.games.name);
      gamesByStudent.set(e.student_id, list);
    });

    const batchesByTeacher = new Map<string, string[]>();
    (assignmentsRes.data || []).forEach((a: any) => {
      const list = batchesByTeacher.get(a.teacher_id) || [];
      if (a.batches?.name) list.push(a.batches.name);
      batchesByTeacher.set(a.teacher_id, list);
    });

    const entries: Entry[] = [
      ...students.map((s: any) => ({
        type: 'student' as const,
        id: s.id,
        name: profileMap.get(s.user_id || '')?.name || '',
        regNo: s.reg_no || '',
        status: s.status,
        contact: s.parent_phone || '',
        parentName: s.parent_name || '',
        user_id: s.user_id,
        games: gamesByStudent.get(s.id) || [],
        batches: [],
        tags: [],
      })),
      ...teachers.map((t: any) => ({
        type: 'teacher' as const,
        id: t.id,
        name: profileMap.get(t.user_id || '')?.name || '',
        regNo: t.teacher_id || '',
        status: t.status,
        role: t.role === 'principal' ? 'Principal' : 'Teacher',
        contact: t.phone || '',
        user_id: t.user_id,
        games: [],
        batches: batchesByTeacher.get(t.id) || [],
        tags: [],
      })),
      ...batches.map((b: any) => ({
        type: 'batch' as const,
        id: b.id,
        name: b.name || '',
        status: 'active',
        games: b.games?.name ? [b.games.name] : [],
        batches: [],
        tags: [],
      })),
    ];

    setEntries(entries);
    setLoading(false);
  }, [instituteId]);

  const openDialog = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelected(null);
    setHighlight(0);
    load();
  }, [load]);

  // Open with Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results = useMemo(() => {
    const q = norm(query);
    if (!q) return entries;
    const tokens = q.split(/\s+/);
    return entries.filter((e) => {
      const hay = norm(
        [
          e.name,
          e.regNo,
          e.role,
          e.contact,
          e.parentName,
          e.type === 'student' ? 'student' : e.type === 'teacher' ? 'teacher principal' : 'batch',
          ...e.games,
          ...e.batches,
        ].join(' ')
      );
      return tokens.every((t) => hay.includes(t));
    });
  }, [entries, query]);

  useEffect(() => setHighlight(0), [query]);

  const groups = useMemo(
    () => ({
      students: results.filter((r) => r.type === 'student'),
      teachers: results.filter((r) => r.type === 'teacher'),
      batches: results.filter((r) => r.type === 'batch'),
    }),
    [results]
  );

  const flat = results;
  const selectedEntry = selected;

  const openSummary = (e: Entry) => {
    setSelected(e);
    setQuery('');
  };

  const handleNavigate = (e: Entry) => {
    setOpen(false);
    setSelected(null);
    onNavigate({ tab: e.type === 'student' ? 'students' : e.type === 'teacher' ? 'teachers' : 'batches', id: e.id, name: e.name });
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[highlight];
      if (item) openSummary(item);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const statusBadge = (status?: string) => {
    const active = status !== 'inactive';
    return (
      <Badge variant={active ? 'default' : 'secondary'} className="shrink-0">
        {active ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const renderGroup = (title: string, items: Entry[], icon: React.ReactNode, startIdx: number) => {
    if (!items.length) return null;
    return (
      <div className="px-1 py-1.5">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {title}
        </p>
        {items.map((item, i) => {
          const idx = startIdx + i;
          return (
            <button
              key={`${item.type}-${item.id}`}
              data-idx={idx}
              onClick={() => openSummary(item)}
              className={cn(
                'w-full text-left flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                idx === highlight ? 'bg-accent' : 'hover:bg-accent/60'
              )}
              onMouseEnter={() => setHighlight(idx)}
            >
              <span className="h-8 w-8 rounded-full bg-brand text-gold border border-gold/30 flex items-center justify-center shrink-0">
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.name || <span className="italic text-muted-foreground">not set</span>}</span>
                  {statusBadge(item.status)}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {[item.regNo, ...item.games, ...item.batches, item.contact].filter(Boolean).join(' · ')}
                </span>
              </span>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    );
  };

  let cursor = 0;
  const studentStart = cursor;
  cursor += groups.students.length;
  const teacherStart = cursor;
  cursor += groups.teachers.length;
  const batchStart = cursor;

  return (
    <>
      {/* Desktop inline trigger */}
      <button
        type="button"
        onClick={openDialog}
        className="hidden md:flex items-center gap-2 h-9 w-56 lg:w-72 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:border-gold/50 transition-colors"
        aria-label="Search students, teachers and batches"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left truncate">Search students, teachers…</span>
        <kbd className="text-[10px] border rounded px-1 py-0.5 text-muted-foreground">Ctrl K</kbd>
      </button>
      {/* Mobile icon trigger */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        aria-label="Search"
        onClick={openDialog}
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Master Search</DialogTitle>
          </DialogHeader>

          {selectedEntry ? (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(null)}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4 mr-1" /> Back
                </Button>
                <p className="text-sm font-medium truncate flex-1">
                  {selectedEntry.type === 'student' ? 'Student' : selectedEntry.type === 'teacher' ? 'Teacher' : 'Batch'} summary
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedEntry.type === 'student' && <StudentProfile studentId={selectedEntry.id} />}
                {selectedEntry.type === 'teacher' && <TeacherProfile teacherId={selectedEntry.id} />}
                {selectedEntry.type === 'batch' && (
                  <div className="text-sm space-y-2 py-6">
                    <p className="font-semibold text-lg">{selectedEntry.name}</p>
                    <p className="text-muted-foreground">{selectedEntry.games.join(', ') || '—'}</p>
                  </div>
                )}
              </div>
              <div className="border-t px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {readOnly ? 'View-only access on the Principal dashboard.' : 'Open the record in its section.'}
                </p>
                <Button size="sm" onClick={() => handleNavigate(selectedEntry)}>
                  Go to {selectedEntry.type === 'student' ? 'Students' : selectedEntry.type === 'teacher' ? 'Teachers' : 'Batches'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b flex items-center gap-2 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search name, reg no, mobile, game, batch…"
                  className="border-0 focus-visible:ring-0 shadow-none px-0 h-9"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="master-search-query"
                />
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto py-1">
                {loading ? (
                  <p className="text-center text-sm text-muted-foreground py-10">Searching…</p>
                ) : flat.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    {query ? `No matches for “${query}”` : 'Start typing to search your institute'}
                  </p>
                ) : (
                  <>
                    {renderGroup('Students', groups.students, <User className="h-4 w-4" />, studentStart)}
                    {renderGroup('Teachers', groups.teachers, <GraduationCap className="h-4 w-4" />, teacherStart)}
                    {renderGroup('Batches', groups.batches, <Layers className="h-4 w-4" />, batchStart)}
                  </>
                )}
              </div>
              <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open summary</span>
                <span className="ml-auto">Esc close</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
