import { useState, useMemo, useEffect, useRef } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  X,
  Flag,
  Building2,
  Users,
  MessageSquare,
  Send,
  Circle,
  CheckCircle,
  Phone,
  Mail,
  Video,
  ClipboardList,
  Eye,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/schedule/CalendarView";
import { EventsList } from "@/components/schedule/EventsList";
import { EventForm } from "@/components/schedule/EventForm";
import { UserFilter } from "@/components/schedule/UserFilter";
import { useScheduleEvents, ScheduleEvent, useUpdateScheduleEvent } from "@/hooks/use-schedule-events";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useScheduleComments } from "@/hooks/use-schedule-comments";

// ─── helpers ────────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  call: { label: "Ligação", color: "#6366f1", bg: "rgba(99,102,241,0.18)", icon: Phone },
  email: { label: "E-mail", color: "#f59e0b", bg: "rgba(245,158,11,0.18)", icon: Mail },
  meeting: { label: "Reunião", color: "#8b5cf6", bg: "rgba(139,92,246,0.18)", icon: Video },
  task: { label: "Tarefa", color: "#f59e0b", bg: "rgba(245,158,11,0.18)", icon: ClipboardList },
  message: { label: "Mensagem", color: "#22c55e", bg: "rgba(34,197,94,0.18)", icon: MessageSquare },
  visit: { label: "Visita", color: "#ec4899", bg: "rgba(236,72,153,0.18)", icon: Eye },
};

const PRIORITY_CONFIG = {
  high: { label: "Alta", textColor: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  medium: { label: "Média", textColor: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  low: { label: "Baixa", textColor: "#22c55e", bg: "rgba(34,197,94,0.15)" },
};

const STATUS_CONFIG: Record<string, { label: string; textColor: string; bg: string }> = {
  pending: { label: "Pendente", textColor: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  confirmed: { label: "Confirmado", textColor: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  completed: { label: "Concluído", textColor: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  cancelled: { label: "Cancelado", textColor: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#8b5cf6", "#06b6d4"];
function avatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Avatar com tooltip ──────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name?: string; size?: number }) {
  const [show, setShow] = useState(false);
  const color = avatarColor(name);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color + "28",
          border: `1.5px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: 600,
          color,
          cursor: "default",
          flexShrink: 0,
        }}
      >
        {getInitials(name)}
      </div>
      {show && name && (
        <div
          style={{
            position: "absolute",
            bottom: "110%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            zIndex: 50,
            pointerEvents: "none",
            border: "0.5px solid #333",
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}

// ─── Painel lateral de detalhes ──────────────────────────────────────────────
function EventDetailPanel({
  event,
  onClose,
  onMarkDone,
}: {
  event: ScheduleEvent | null;
  onClose: () => void;
  onMarkDone: (id: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [localComments, setLocalComments] = useState<{ text: string; time: string }[]>([]);
  const [subtasks, setSubtasks] = useState<{ label: string; done: boolean }[]>([
    { label: "Confirmar com o cliente", done: false },
    { label: "Preparar documentação", done: false },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalComments([]);
    setComment("");
  }, [event?.id]);

  if (!event) return null;

  const typeConf = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.task;
  const prioConf = (PRIORITY_CONFIG as any)[(event as any).priority ?? "medium"] ?? PRIORITY_CONFIG.medium;
  const statusConf = STATUS_CONFIG[event.status ?? "pending"] ?? STATUS_CONFIG.pending;
  const TypeIcon = typeConf.icon;

  const sendComment = () => {
    if (!comment.trim()) return;
    setLocalComments((c) => [...c, { text: comment.trim(), time: "Agora" }]);
    setComment("");
  };

  const toggleSubtask = (i: number) => {
    setSubtasks((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)));
  };

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "0.5px solid rgba(255,255,255,0.07)",
        background: "var(--color-background-secondary)",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {/* tipo badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: typeConf.bg,
                  color: typeConf.color,
                }}
              >
                <TypeIcon size={10} />
                {typeConf.label}
              </span>
              {/* status badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: statusConf.bg,
                  color: statusConf.textColor,
                }}
              >
                {statusConf.label}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
              {event.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                fontSize: 11,
                color: "var(--color-text-tertiary)",
              }}
            >
              <Clock size={11} />
              {format(new Date(event.start_time), "HH:mm")}
              {event.end_time && ` – ${format(new Date(event.end_time), "HH:mm")}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-tertiary)",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Responsáveis */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Users size={11} /> Responsáveis
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {event.user && <Avatar name={event.user.name} />}
            {/* Aqui você pode mapear múltiplos users quando o hook suportar */}
            <button
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px dashed rgba(255,255,255,0.2)",
                background: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-tertiary)",
              }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Lead */}
        {event.lead && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Building2 size={11} /> Lead / Cliente
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{event.lead.name}</div>
          </div>
        )}

        {/* Prioridade */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Flag size={11} /> Prioridade
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              background: prioConf.bg,
              color: prioConf.textColor,
            }}
          >
            {prioConf.label}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)" }} />

        {/* Subtarefas */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Subtarefas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {subtasks.map((s, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => toggleSubtask(i)}
                  style={{ accentColor: "var(--color-text-info)", width: 14, height: 14 }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: s.done ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                    textDecoration: s.done ? "line-through" : "none",
                  }}
                >
                  {s.label}
                </span>
              </label>
            ))}
          </div>
          <button
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={12} /> Adicionar subtarefa
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)" }} />

        {/* Comentários */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MessageSquare size={11} /> Comentários
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
            {localComments.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <Avatar name="Eu" size={24} />
                <div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                      borderRadius: "0 8px 8px 8px",
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {c.text}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3 }}>{c.time}</div>
                </div>
              </div>
            ))}
            {localComments.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", padding: "8px 0" }}>
                Nenhum comentário ainda
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Adicionar comentário..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 12,
                color: "var(--color-text-primary)",
                outline: "none",
              }}
            />
            <button
              onClick={sendComment}
              style={{
                background: "#ff4e1a",
                border: "none",
                borderRadius: 8,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
        {event.status !== "completed" ? (
          <button
            onClick={() => onMarkDone(event.id)}
            style={{
              width: "100%",
              background: "none",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "8px 0",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#22c55e";
              (e.currentTarget as HTMLButtonElement).style.color = "#22c55e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
            }}
          >
            <CheckCircle size={14} /> Marcar como concluído
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 12,
              color: "#22c55e",
            }}
          >
            <CheckCircle2 size={14} /> Concluído
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Agenda() {
  const { profile } = useAuth();

  const { data: isTeamLeader = false } = useQuery({
    queryKey: ["is-team-leader", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase.rpc("is_team_leader", { check_user_id: profile.id });
      return data || false;
    },
    enabled: !!profile?.id,
  });

  const { data: users = [] } = useUsers();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pivotDate, setPivotDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year" | "list">(() => {
    const saved = localStorage.getItem("agendaViewMode");
    return (saved as any) || "week";
  });
  useEffect(() => {
    localStorage.setItem("agendaViewMode", viewMode);
  }, [viewMode]);

  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);
  const updateEventMutation = useUpdateScheduleEvent();

  const dateRange = useMemo(() => {
    switch (viewMode) {
      case "day":
        return { startDate: startOfDay(pivotDate), endDate: endOfDay(pivotDate) };
      case "week":
        return {
          startDate: startOfWeek(pivotDate, { weekStartsOn: 0 }),
          endDate: endOfWeek(pivotDate, { weekStartsOn: 0 }),
        };
      case "month":
        return {
          startDate: startOfWeek(startOfMonth(pivotDate), { weekStartsOn: 0 }),
          endDate: endOfWeek(endOfMonth(pivotDate), { weekStartsOn: 0 }),
        };
      case "year":
        return { startDate: startOfYear(pivotDate), endDate: endOfYear(pivotDate) };
      default:
        return { startDate: startOfDay(new Date()), endDate: addDays(new Date(), 30) };
    }
  }, [pivotDate, viewMode]);

  const { data: events = [] } = useScheduleEvents({
    userId: selectedUserId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const selectedDayEvents = useMemo(() => {
    const s = startOfDay(selectedDate),
      e = endOfDay(selectedDate);
    return events.filter((ev) => {
      const d = new Date(ev.start_time);
      return d >= s && d <= e;
    });
  }, [events, selectedDate]);

  const weekStats = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 0 });
    const we = endOfWeek(new Date(), { weekStartsOn: 0 });
    const wev = events.filter((e) => isWithinInterval(new Date(e.start_time), { start: ws, end: we }));
    return {
      pending: wev.filter((e) => e.status !== "completed").length,
      completed: wev.filter((e) => e.status === "completed").length,
      meetings: wev.filter((e) => e.event_type === "meeting").length,
      visits: wev.filter((e) => e.event_type === "visit").length,
      tasks: wev.filter((e) => e.event_type === "task").length,
    };
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const next = addDays(today, 7);
    return events
      .filter((ev) => {
        const d = new Date(ev.start_time);
        return d >= today && d <= next && ev.status !== "completed";
      })
      .slice(0, 10);
  }, [events]);

  const handleEditEvent = (event: ScheduleEvent) => {
    setDetailEvent(event);
  };

  const handleCloseEventForm = () => {
    setEventFormOpen(false);
    setEditingEvent(null);
  };

  const handleMarkDone = (id: string) => {
    updateEventMutation.mutate({ id, status: "completed" });
    setDetailEvent((prev) => (prev ? { ...prev, status: "completed" } : null));
  };

  const canFilterUsers = profile?.role === "admin" || isTeamLeader;

  const VIEW_MODES = [
    { value: "day", label: "Dia", icon: Clock },
    { value: "week", label: "Semana", icon: LayoutGrid },
    { value: "month", label: "Mês", icon: CalendarIcon },
    { value: "list", label: "Lista", icon: List },
  ];

  const TYPE_LEGEND = [
    { key: "call", label: "Ligação" },
    { key: "email", label: "E-mail" },
    { key: "meeting", label: "Reunião" },
    { key: "task", label: "Tarefa" },
    { key: "message", label: "Mensagem" },
    { key: "visit", label: "Visita" },
  ];

  return (
    <AppLayout title="Agenda" disableMainScroll={true}>
      <div
        style={{
          display: "flex",
          height: "100%",
          overflow: "hidden",
          borderRadius: 16,
          border: "0.5px solid rgba(255,255,255,0.07)",
          background: "var(--color-background-primary)",
        }}
      >
        {/* ── Área principal (calendário) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Header da agenda */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderBottom: "0.5px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              style={{
                background: "rgba(255,78,26,0.15)",
                color: "#ff4e1a",
                border: "none",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => setPivotDate(new Date())}
            >
              Hoje
            </button>
            <div style={{ display: "flex", gap: 2 }}>
              <button
                style={{
                  background: "none",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  color: "var(--color-text-secondary)",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() =>
                  setPivotDate((d) => addDays(d, viewMode === "week" ? -7 : viewMode === "month" ? -30 : -1))
                }
              >
                <ChevronLeft size={14} />
              </button>
              <button
                style={{
                  background: "none",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  color: "var(--color-text-secondary)",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setPivotDate((d) => addDays(d, viewMode === "week" ? 7 : viewMode === "month" ? 30 : 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
              {viewMode === "week"
                ? `${format(startOfWeek(pivotDate, { weekStartsOn: 0 }), "d", { locale: ptBR })} – ${format(endOfWeek(pivotDate, { weekStartsOn: 0 }), "d 'de' MMMM, yyyy", { locale: ptBR })}`
                : format(pivotDate, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setEventFormOpen(true)}
              style={{
                background: "#ff4e1a",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "0.04em",
              }}
            >
              <Plus size={15} /> Novo agendamento
            </button>
          </div>

          {/* Calendário / lista */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {viewMode !== "list" ? (
              <CalendarView
                events={events}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                pivotDate={pivotDate}
                onPivotChange={setPivotDate}
                viewMode={viewMode as any}
                onEditEvent={handleEditEvent}
                onEventUpdate={(id, updates) => updateEventMutation.mutate({ id, ...updates })}
                onQuickCreate={(date) => {
                  setSelectedDate(date);
                  setEventFormOpen(true);
                }}
              />
            ) : (
              <div style={{ height: "100%", padding: 24, overflowY: "auto" }}>
                <EventsList events={upcomingEvents} onEditEvent={handleEditEvent} showUser={true} />
              </div>
            )}
          </div>

          {/* Legenda de tipos no rodapé */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              padding: "8px 0",
              borderTop: "0.5px solid rgba(255,255,255,0.07)",
            }}
          >
            {TYPE_LEGEND.map((t) => {
              const conf = EVENT_TYPE_CONFIG[t.key];
              return (
                <div
                  key={t.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: conf.color }} />
                  {t.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar direita ── */}
        <div
          style={{
            width: detailEvent ? 320 : 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "0.5px solid rgba(255,255,255,0.07)",
            background: "var(--color-background-secondary)",
            transition: "width 0.2s ease",
            overflow: "hidden",
          }}
        >
          {detailEvent ? (
            // Painel de detalhes do evento selecionado
            <EventDetailPanel event={detailEvent} onClose={() => setDetailEvent(null)} onMarkDone={handleMarkDone} />
          ) : (
            // Sidebar padrão
            <ScrollArea style={{ flex: 1 }}>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Filtro por equipe */}
                {canFilterUsers && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <SideLabel>Filtro por Equipe</SideLabel>
                    <UserFilter users={users} selectedUserId={selectedUserId} onUserSelect={setSelectedUserId} />
                  </div>
                )}

                {/* Visualização */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <SideLabel>Visualização</SideLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {VIEW_MODES.map((m) => {
                      const active = viewMode === m.value;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setViewMode(m.value as any)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 10px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            border: "0.5px solid",
                            borderColor: active ? "#ff4e1a" : "rgba(255,255,255,0.1)",
                            background: active ? "rgba(255,78,26,0.12)" : "transparent",
                            color: active ? "#ff4e1a" : "var(--color-text-secondary)",
                            transition: "all 0.15s",
                          }}
                        >
                          <Icon size={13} /> {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Divider />

                {/* Resumo da semana */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SideLabel>Resumo da Semana</SideLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <StatCard value={weekStats.pending} label="Pendentes" color="#f59e0b" />
                    <StatCard value={weekStats.completed} label="Concluídos" color="#22c55e" />
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "0.5px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {[
                      { label: "Reuniões", value: weekStats.meetings, color: "#8b5cf6" },
                      { label: "Visitas", value: weekStats.visits, color: "#ec4899" },
                      { label: "Tarefas", value: weekStats.tasks, color: "#6366f1" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                          {s.label}
                        </span>
                        <span style={{ color: "var(--color-text-primary)" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Atividades do dia selecionado */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <SideLabel>
                      {startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()
                        ? "Hoje"
                        : format(selectedDate, "dd/MM")}
                    </SideLabel>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#ff4e1a",
                        background: "rgba(255,78,26,0.1)",
                        padding: "2px 8px",
                        borderRadius: 20,
                      }}
                    >
                      {selectedDayEvents.length} atividades
                    </span>
                  </div>

                  {selectedDayEvents.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedDayEvents.map((ev) => {
                        const conf = EVENT_TYPE_CONFIG[ev.event_type] ?? EVENT_TYPE_CONFIG.task;
                        return (
                          <div
                            key={ev.id}
                            onClick={() => setDetailEvent(ev)}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "0.5px solid rgba(255,255,255,0.07)",
                              borderLeft: `3px solid ${conf.color}`,
                              borderRadius: 10,
                              padding: "10px 12px",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)")
                            }
                            onMouseLeave={(e) =>
                              ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)")
                            }
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "var(--color-text-primary)",
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ev.title}
                              </div>
                              {ev.status === "completed" && (
                                <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginTop: 4,
                              }}
                            >
                              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                                {format(new Date(ev.start_time), "HH:mm")}
                              </span>
                              {ev.user && <Avatar name={ev.user.name} size={20} />}
                            </div>
                            {ev.lead && (
                              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                                {ev.lead.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px dashed rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "24px 0",
                        textAlign: "center",
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Nenhuma atividade
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* EventForm permanece igual */}
      <EventForm
        open={eventFormOpen}
        onOpenChange={handleCloseEventForm}
        event={editingEvent}
        defaultUserId={selectedUserId || profile?.id}
        defaultDate={selectedDate}
      />
    </AppLayout>
  );
}

// ─── Sub-componentes pequenos ────────────────────────────────────────────────

function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 700,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff4e1a" }} />
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)" }} />;
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
