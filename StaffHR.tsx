/* Pravaa v2 — Staff & HR  (real data, no mocks) */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ociProxyUrl } from '../lib/ociImage';
import {
  Users, Plus, Pencil, Trash2, Search, X, Eye, EyeOff,
  Loader2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, CalendarDays,
  Shield, Lock, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { getRoleLabel, getRoleBadgeColor, DELETE_WINDOW_HOURS } from '../lib/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KPI, Pill, OsCard, OsModal, PageHeader, OsTabs, BarChart, useToast,
} from '../components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'manager' | 'user' | 'coordinator' | 'client-coordinator' | 'designer' | 'procurement';
  employeeId?:   string | null;
  firstName?:    string | null;
  middleName?:   string | null;
  lastName?:     string | null;
  gmailEmail?:   string | null;
  phone?:        string | null;
  salary?:       number | null;
  monthlyCTC?:   number | null;
  yearlyCTC?:    number | null;
  vehicle?:      string | null;
  languages?:    string | null;
  experience?:   string | null;
  designation?:  string | null;
  joiningDate?:  string | null;
  profilePhoto?: string | null;
  department?:   string | null;
  personalEmail?:    string | null;
  companyEmail?:     string | null;
  departmentEmail?:  string | null;
  reportingTo?:      string | null;
  responsibleFor?:   string | null;
  homeAddress?:      string | null;
  emergencyContact?: string | null;
  bankACDetails?:    string | null;
  resumeUrl?:            string | null;
  aadharCardUrl?:        string | null;
  panCardUrl?:           string | null;
  resignationLetterUrl?: string | null;
  offerLetterUrl?:       string | null;
  annexureUrl?:          string | null;
  inductionAgreementUrl?:string | null;
  sopKraUrl?:            string | null;
  otherDocuments?:       string | null;
  references?:           string | null;
  linkedinUrl?:  string | null;
  portfolioUrl?: string | null;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;         // ISO string, midnight UTC
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  hoursWorked?: number | null;
  gpsVerified: boolean;
  notes?: string | null;
  markedBy?: string | null;
}

type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';

interface AttendanceSummary {
  [userId: string]: {
    present: number; absent: number; halfDay: number;
    leave: number; holiday: number; totalHours: number; gpsVerified: number;
  };
}

interface PerfRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  qualityScore: number;
  survivalPct: number;
  sitesCount: number;
  onTimePct: number;
  notes?: string | null;
}

function getErrorMessage(e: unknown, fallback: string): string {
  if (!e || typeof e !== 'object') return fallback;
  const obj = e as Record<string, unknown>;
  if (typeof obj['error'] === 'string') return obj['error'];
  const details = obj['details'];
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0] as Record<string, unknown>;
    if (typeof first['msg'] === 'string') return first['msg'];
  }
  if (typeof obj['message'] === 'string') return obj['message'];
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; pill: 'leaf' | 'sky' | 'gold' | 'neutral' | 'terra' }> = {
  'super-admin': { label: 'Super Admin',  pill: 'leaf'    },
  admin:         { label: 'Admin',        pill: 'sky'     },
  manager:       { label: 'Manager',      pill: 'gold'    },
  user:          { label: 'Field Staff',  pill: 'neutral' },
  coordinator:          { label: 'Coordinator',        pill: 'terra'   },
  'client-coordinator': { label: 'Client Coordinator', pill: 'sky'     },
  designer:             { label: 'Designer',           pill: 'sky'     },
  procurement:   { label: 'Procurement', pill: 'gold'    },
};

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: React.ReactElement }> = {
  present:  { label: 'Present',  color: 'var(--color-leaf)',      bg: 'var(--color-leaf-tint)',  icon: <CheckCircle2 size={12} /> },
  absent:   { label: 'Absent',   color: 'var(--color-terra)',     bg: 'var(--color-terra-tint)', icon: <XCircle     size={12} /> },
  'half-day': { label: 'Half Day', color: 'var(--color-gold)',    bg: 'var(--color-gold-tint)',  icon: <Clock       size={12} /> },
  leave:    { label: 'Leave',    color: 'var(--color-sky)',       bg: 'var(--color-sky-tint)',   icon: <CalendarDays size={12} /> },
  holiday:  { label: 'Holiday',  color: 'var(--color-ink-faint)', bg: 'var(--color-surface-2)',  icon: <CalendarDays size={12} /> },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DEPARTMENTS: { code: string; label: string; email: string }[] = [
  { code: 'FO',  label: "Founder's Office",                  email: '' },
  { code: 'AD',  label: 'Admin',                             email: 'evolve@pravaa.in' },
  { code: 'FOP', label: 'Field Operations',                  email: 'pulse@pravaa.in' },
  { code: 'HM',  label: 'Horticulture & Maintenance',        email: 'pulse@pravaa.in' },
  { code: 'DI',  label: 'Design & Innovation',               email: 'genesis@pravaa.in' },
  { code: 'ITS', label: 'IT & Systems',                      email: 'matrix@pravaa.in' },
  { code: 'AF',  label: 'Accounts & Finance',                email: 'flows@pravaa.in' },
  { code: 'SMC', label: 'Sales, Marketing & Customer Relations', email: 'evolve@pravaa.in' },
  { code: 'BS',  label: 'Branding & Strategy',               email: 'genesis@pravaa.in' },
];

const LANG_OPTIONS = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'];

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const data = await apiClient.postForm<{ url: string }>('/api/file-upload/single', fd);
  return data.url;
}

const ROLE_PERMISSIONS: Record<string, { label: string; permissions: string[] }> = {
  'super-admin': {
    label: 'Super Admin',
    permissions: [
      'View all data across the system',
      'Add, edit, and delete records in all sections',
      'Delete records of any age without approval',
      'Manage user accounts (create, edit, delete, change roles)',
      'Access Control management',
      'View sensitive files and audit logs',
      'Approve or reject delete requests from admins',
    ],
  },
  admin: {
    label: 'Admin',
    permissions: [
      'View all data',
      'Add records in all sections',
      'Edit records in all sections',
      `Delete records created within ${DELETE_WINDOW_HOURS} hours (no approval needed)`,
      `Delete records older than ${DELETE_WINDOW_HOURS} hours (requires Super Admin approval)`,
      'View audit logs',
    ],
  },
  manager: {
    label: 'Manager',
    permissions: [
      'View all data',
      'Add records in all sections',
      'Edit records in all sections',
    ],
  },
  coordinator: {
    label: 'Coordinator',
    permissions: [
      'View operational data',
      'Add and edit field operations records',
    ],
  },
  'client-coordinator': {
    label: 'Client Coordinator',
    permissions: [
      'View client and site data',
      'Coordinate client visits and schedules',
      'Manage field staff assignments for assigned clients',
    ],
  },
  designer: {
    label: 'Designer',
    permissions: [
      'View all data',
      'Manage design boards and site plans',
    ],
  },
  procurement: {
    label: 'Procurement',
    permissions: [
      'View inventory and procurement data',
      'Create and manage procurement orders',
    ],
  },
  user: {
    label: 'Field Staff',
    permissions: [
      'View all data',
      'Comment on records',
    ],
  },
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  color: 'var(--color-ink-faint)', letterSpacing: '1px',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--color-line)', background: 'var(--color-surface-2)',
  fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-ink)',
  outline: 'none', boxSizing: 'border-box',
};
const monoFaint: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  color: 'var(--color-ink-faint)', letterSpacing: '1px',
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (module scope — no component state needed)
// ─────────────────────────────────────────────────────────────────────────────

function attendanceColor(pct: number): string {
  if (pct >= 90) return 'var(--color-leaf)';
  if (pct >= 75) return 'var(--color-gold)';
  return 'var(--color-terra)';
}

function qualityScoreVariant(score: number): 'leaf' | 'gold' | 'terra' {
  if (score >= 80) return 'leaf';
  if (score >= 65) return 'gold';
  return 'terra';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function datesInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month - 1, d));
  return days;
}

function isPlaceholderEmail(email: string) {
  return email.startsWith('emp_') && email.endsWith('@noaccess.pravaa.internal');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const COLORS = ['#2f5a3a', '#4a6680', '#b08838', '#b8493a', '#a04860'];
  const bg = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.34, fontWeight: 600, flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OsBtn
// ─────────────────────────────────────────────────────────────────────────────

function OsBtn({
  onClick, children, variant = 'default', disabled = false, size = 'md',
}: {
  onClick?: (e?: React.MouseEvent) => void; children: React.ReactNode;
  variant?: 'default' | 'leaf' | 'terra' | 'ghost'; disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const BG  = { default: 'var(--color-surface)', leaf: 'var(--color-leaf)', terra: 'var(--color-terra)', ghost: 'transparent' };
  const COL = { default: 'var(--color-ink-soft)', leaf: 'white', terra: 'white', ghost: 'var(--color-ink-soft)' };
  const PAD = { sm: '4px 10px', md: '7px 14px' };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: PAD[size], borderRadius: 8,
      border: variant === 'ghost' ? 'none' : '1px solid var(--color-line)',
      background: BG[variant], color: COL[variant],
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-ui)',
      opacity: disabled ? 0.5 : 1, transition: 'opacity 0.12s',
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Org Chart
// ─────────────────────────────────────────────────────────────────────────────

// ── Org chart tree node type ──────────────────────────────────────────────────
interface OrgNode { member: StaffMember; children: OrgNode[]; }

const ROLE_ORDER = ['super-admin', 'admin', 'manager', 'coordinator', 'designer', 'procurement', 'user'];
const ROLE_COLOR: Record<string, string> = {
  'super-admin': '#2f5a3a', admin: '#4a6680', manager: '#b08838',
  coordinator: '#b8493a', designer: '#4a6680',
  procurement: '#b08838', user: '#888',
};

function getPulseBand(score: number): { color: string; hex: string } {
  if (score >= 85) return { color: 'var(--color-leaf)', hex: '#2f5a3a' };
  if (score >= 72) return { color: 'var(--color-gold)', hex: '#b08838' };
  if (score >= 60) return { color: 'var(--color-sky)',  hex: '#4a6680' };
  return { color: 'var(--color-terra)', hex: '#b8493a' };
}

function buildOrgNameIndex(staff: StaffMember[]): Map<string, StaffMember> {
  const byName = new Map<string, StaffMember>();
  staff.forEach(s => {
    const full = [s.firstName, s.lastName].filter(Boolean).join(' ').toLowerCase();
    if (full) byName.set(full, s);
    byName.set(s.name.toLowerCase(), s);
  });
  return byName;
}

function buildOrgChildMap(staff: StaffMember[], byName: Map<string, StaffMember>): {
  childrenOf: Map<string, StaffMember[]>;
  hasParent: Set<string>;
} {
  const childrenOf = new Map<string, StaffMember[]>();
  const hasParent  = new Set<string>();
  staff.forEach(s => {
    if (!s.reportingTo) return;
    const parent = byName.get(s.reportingTo.toLowerCase().trim());
    if (!parent || parent.id === s.id) return;
    if (!childrenOf.has(parent.id)) childrenOf.set(parent.id, []);
    childrenOf.get(parent.id)!.push(s);
    hasParent.add(s.id);
  });
  return { childrenOf, hasParent };
}

function buildOrgNode(m: StaffMember, childrenOf: Map<string, StaffMember[]>): OrgNode {
  return { member: m, children: (childrenOf.get(m.id) ?? []).map(c => buildOrgNode(c, childrenOf)) };
}

function buildRoleTierNodes(tierIdx: number, tiers: string[], byRole: Record<string, StaffMember[]>): OrgNode[] {
  const roleKey = tiers[tierIdx];
  const members = byRole[roleKey];
  const childNodes = tierIdx + 1 < tiers.length ? buildRoleTierNodes(tierIdx + 1, tiers, byRole) : [];

  if (members.length === 1) {
    return [{ member: members[0], children: childNodes }];
  }
  return members.map((m, i) => ({
    member: m,
    children: childNodes.filter((_, ci) => ci % members.length === i),
  }));
}

function buildOrgTree(staff: StaffMember[]): OrgNode[] {
  if (!staff.length) return [];

  const byName = buildOrgNameIndex(staff);
  const { childrenOf, hasParent } = buildOrgChildMap(staff, byName);

  if (hasParent.size > 0) {
    const roots = staff.filter(s => !hasParent.has(s.id));
    return roots.map(m => buildOrgNode(m, childrenOf));
  }

  // Fallback: role-based hierarchy
  const byRole: Record<string, StaffMember[]> = {};
  ROLE_ORDER.forEach(r => (byRole[r] = []));
  staff.forEach(s => { if (byRole[s.role]) byRole[s.role].push(s); });

  const tiers = ROLE_ORDER.filter(r => byRole[r].length > 0);
  if (!tiers.length) return [];

  return buildRoleTierNodes(0, tiers, byRole);
}

// ── CSS connector tree styles ─────────────────────────────────────────────────
function OrgTreeStyles() {
  return (
    <style>{`
      .org-scroll { overflow-x: auto; overflow-y: auto; padding: 32px 28px 28px; }
      .org-tree { display: inline-block; min-width: 100%; text-align: center; }
      .org-tree ul { position: relative; padding-top: 26px; display: flex; justify-content: center; gap: 0; margin: 0; padding-left: 0; }
      .org-tree li { list-style: none; position: relative; padding: 26px 14px 0; text-align: center; }
      .org-tree li::before, .org-tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 1.5px solid #ccc; width: 50%; height: 26px; box-sizing: border-box; }
      .org-tree li::after { right: auto; left: 50%; border-left: 1.5px solid #ccc; }
      .org-tree li:only-child::before, .org-tree li:only-child::after { display: none; }
      .org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
      .org-tree li:last-child::before { border-right: 1.5px solid #ccc; border-radius: 0 5px 0 0; }
      .org-tree li:first-child::after { border-radius: 5px 0 0 0; }
      .org-tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1.5px solid #ccc; width: 0; height: 26px; }
      .org-tree > ul { padding-top: 0; }
      .org-tree > ul > li:only-child::before, .org-tree > ul > li:only-child::after { display: none; }

      .org-node {
        display: flex; flex-direction: column;
        background: #fff;
        border: 1px solid #e2e2dc;
        border-top-width: 4px;
        border-radius: 10px;
        cursor: pointer;
        min-width: 190px; max-width: 230px;
        text-align: left;
        user-select: none;
        box-shadow: 0 1px 5px rgba(0,0,0,0.07);
        transition: transform 0.13s, box-shadow 0.13s;
        overflow: hidden;
      }
      .org-node:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.13); }
      .org-node-body { padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 6px; }
      .org-node-header { display: flex; align-items: center; gap: 10px; }
      .org-node-info { flex: 1; min-width: 0; }
      .org-name { font-weight: 700; font-size: 13.5px; color: #1a1a1a; line-height: 1.25; }
      .org-pos  { font-size: 11.5px; color: #555; line-height: 1.3; margin-top: 1px; }
      .org-node-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 7px; border-top: 1px solid #eee; }
      .org-dept { font-size: 9px; font-family: var(--font-mono); color: #999; text-transform: uppercase; letter-spacing: 1px; }
      .org-score { font-size: 11px; font-family: var(--font-mono); font-weight: 700; display: flex; align-items: center; gap: 3px; }
    `}</style>
  );
}

// ── Single card node ──────────────────────────────────────────────────────────
function OrgCard({ node, onSelect, perfData }: {
  node: OrgNode; onSelect: (id: string) => void; perfData: PerfRecord[];
}) {
  const m    = node.member;
  const perf = perfData.find(p => p.userId === m.id);
  const score = perf?.qualityScore ?? null;

  const topColor = score != null
    ? getPulseBand(score).hex
    : (ROLE_COLOR[m.role] ?? '#888');

  const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.name;
  const pos  = m.designation || ROLE_META[m.role as keyof typeof ROLE_META]?.label || m.role;
  const dept = m.department?.toUpperCase() ?? '';

  return (
    <div
      className="org-node"
      style={{ borderTopColor: topColor }}
      onClick={() => onSelect(m.id)}
      title={`View ${name}'s full profile`}
    >
      <div className="org-node-body">
        <div className="org-node-header">
          {m.profilePhoto
            ? <img src={ociProxyUrl(m.profilePhoto)} alt={name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                  border: `2px solid ${topColor}55`, flexShrink: 0 }} />
            : <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: topColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0, userSelect: 'none',
              }}>
                {name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
          }
          <div className="org-node-info">
            <div className="org-name">{name}</div>
            <div className="org-pos">{pos}</div>
          </div>
        </div>
        {(dept || score != null) && (
          <div className="org-node-footer">
            <span className="org-dept">{dept}</span>
            {score != null && (
              <span className="org-score" style={{ color: topColor }}>◆ {score}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recursive tree renderer ───────────────────────────────────────────────────
function OrgTree({ node, onSelect, perfData }: {
  node: OrgNode; onSelect: (id: string) => void; perfData: PerfRecord[];
}) {
  return (
    <li>
      <OrgCard node={node} onSelect={onSelect} perfData={perfData} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map(k => (
            <OrgTree key={k.member.id} node={k} onSelect={onSelect} perfData={perfData} />
          ))}
        </ul>
      )}
    </li>
  );
}

const PULSE_LEGEND = [
  { hex: '#2f5a3a', label: 'Star 85+' },
  { hex: '#b08838', label: 'Solid 72+' },
  { hex: '#4a6680', label: 'Developing 60+' },
  { hex: '#b8493a', label: 'At risk <60' },
] as const;

function OrgChartView({ staff, onSelect, perfData }: {
  staff: StaffMember[]; onSelect: (id: string) => void; perfData: PerfRecord[];
}) {
  const roots = buildOrgTree(staff);

  if (!roots.length) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-ink-faint)' }}>
      <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>No staff to chart</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <OrgTreeStyles />

      {/* Header */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
          Reporting Lines · Click anyone for their full 360° profile
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontStyle: 'italic', color: 'var(--color-ink)', lineHeight: 1 }}>
          Organogram
        </div>
      </div>

      {/* Tree */}
      <div style={{ background: '#faf9f6', borderRadius: 14, border: '1px solid #e8e6df', overflowX: 'auto' }}>
        <div className="org-scroll">
          <div className="org-tree">
            <ul>
              {roots.map(r => (
                <OrgTree key={r.member.id} node={r} onSelect={onSelect} perfData={perfData} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pulse band legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)' }}>
        <span>Top bar colour = Pulse band:</span>
        {PULSE_LEGEND.map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.hex, display: 'inline-block', flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field — reusable labelled wrapper (must live OUTSIDE modal to avoid remount)
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageCropModal — simple circle-crop for profile photos
// ─────────────────────────────────────────────────────────────────────────────

function ImageCropModal({ src, onDone, onClose }: {
  src: string; onDone: (blob: Blob) => void; onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [scale,  setScale]  = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [drag,   setDrag]   = React.useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const SIZE = 260;

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2 + offset.x, (SIZE - h) / 2 + offset.y, w, h);
      ctx.restore();
      // Dim overlay outside circle
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    img.src = src;
  }, [src, scale, offset]);

  React.useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDrag({ sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    setOffset({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) });
  };
  const onMouseUp = () => setDrag(null);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => { if (blob) onDone(blob); }, 'image/jpeg', 0.92);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Crop Profile Photo</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef} width={SIZE} height={SIZE}
            style={{ borderRadius: '50%', cursor: drag ? 'grabbing' : 'grab', border: '2px solid var(--color-leaf)' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ ...labelStyle }}>Zoom</label>
          <input type="range" min={0.5} max={3} step={0.05} value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            style={{ accentColor: 'var(--color-leaf)', width: '100%' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', textAlign: 'center' }}>
          Drag to reposition · Scroll slider to zoom
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <OsBtn onClick={onClose}>Cancel</OsBtn>
          <OsBtn variant="leaf" onClick={handleCrop}><CheckCircle2 size={12} /> Use Photo</OsBtn>
        </div>
      </div>
    </div>
  );
}

function photoLabel(value: string): string {
  if (value) return 'Change Photo';
  return 'Upload Photo';
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotoUploadField — opens crop modal then uploads cropped image
// ─────────────────────────────────────────────────────────────────────────────

function PhotoUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [cropSrc,   setCropSrc]   = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [err,       setErr]       = React.useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const handleCropDone = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true); setErr('');
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      const url  = await uploadFile(file);
      onChange(url);
    } catch { setErr('Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  return (
    <>
      {cropSrc && <ImageCropModal src={cropSrc} onDone={handleCropDone} onClose={() => setCropSrc(null)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {value
          ? <img src={ociProxyUrl(value)} alt="profile" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-line)' }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-surface-2)', border: '2px dashed var(--color-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color="var(--color-ink-faint)" />
            </div>
        }
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, cursor: 'pointer', border: '1px solid var(--color-line)',
          background: 'var(--color-surface-2)', fontSize: 12.5,
          color: 'var(--color-ink-soft)', fontFamily: 'var(--font-ui)',
        }}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {uploading ? 'Uploading…' : photoLabel(value)}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {err && <span style={{ fontSize: 11, color: 'var(--color-terra)' }}>{err}</span>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUploadField — uploads file and stores URL
// ─────────────────────────────────────────────────────────────────────────────

function FileUploadField({ label, value, onChange, required = false, accept = '*' }: {
  label: string; value: string; onChange: (url: string) => void;
  required?: boolean; accept?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setErr('');
    try {
      const url = await uploadFile(f);
      onChange(url);
    } catch { setErr('Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--color-line)', background: 'var(--color-surface-2)',
          fontSize: 12.5, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-ui)',
        }}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {uploading ? 'Uploading…' : 'Upload file'}
          <input type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {value && (
          <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-leaf)', textDecoration: 'underline' }}>
            View
          </a>
        )}
        {err && <span style={{ fontSize: 11, color: 'var(--color-terra)' }}>{err}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee Add / Edit Modal — full HR onboarding form
// ─────────────────────────────────────────────────────────────────────────────

type EmpStep = 'personal' | 'employment' | 'compensation' | 'documents' | 'online';
const EMP_STEPS: { key: EmpStep; label: string }[] = [
  { key: 'personal',     label: '① Personal'    },
  { key: 'employment',   label: '② Employment'  },
  { key: 'compensation', label: '③ Compensation' },
  { key: 'documents',    label: '④ Documents'   },
  { key: 'online',       label: '⑤ Online'      },
];

interface BlankEmp {
  firstName: string; middleName: string; lastName: string;
  email: string; password: string; role: string;
  phone: string; personalEmail: string; emergencyContact: string;
  languages: string[];
  homeAddress: string;
  department: string; departmentEmail: string; companyEmail: string;
  designation: string; joiningDate: string; reportingTo: string;
  responsibleFor: string[];
  vehicle: string;
  monthlyCTC: string; yearlyCTC: string;
  bankName: string; accountNumber: string; ifscCode: string; accountType: string;
  profilePhoto: string; resumeUrl: string; aadharCardUrl: string; panCardUrl: string;
  resignationLetterUrl: string; offerLetterUrl: string; annexureUrl: string;
  inductionAgreementUrl: string; sopKraUrl: string; otherDocuments: { name: string; url: string }[];
  ref1Name: string; ref1Relation: string; ref1Phone: string; ref1Email: string;
  ref2Name: string; ref2Relation: string; ref2Phone: string; ref2Email: string;
  linkedinUrl: string; portfolioUrl: string;
}

const BLANK_EMP: BlankEmp = {
  firstName: '', middleName: '', lastName: '',
  email: '', password: '', role: 'user',
  phone: '', personalEmail: '', emergencyContact: '',
  languages: [],
  homeAddress: '',
  department: '', departmentEmail: '', companyEmail: '',
  designation: '', joiningDate: '', reportingTo: '',
  responsibleFor: [],
  vehicle: '',
  monthlyCTC: '', yearlyCTC: '',
  bankName: '', accountNumber: '', ifscCode: '', accountType: 'Savings',
  profilePhoto: '', resumeUrl: '', aadharCardUrl: '', panCardUrl: '',
  resignationLetterUrl: '', offerLetterUrl: '', annexureUrl: '',
  inductionAgreementUrl: '', sopKraUrl: '', otherDocuments: [],
  ref1Name: '', ref1Relation: '', ref1Phone: '', ref1Email: '',
  ref2Name: '', ref2Relation: '', ref2Phone: '', ref2Email: '',
  linkedinUrl: '', portfolioUrl: '',
};

function parseBankDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || '{}') as { bankName?: string; accountNumber?: string; ifscCode?: string; accountType?: string }; }
  catch { return {} as { bankName?: string; accountNumber?: string; ifscCode?: string; accountType?: string }; }
}

function parseRefs(raw: string | null | undefined) {
  try { return JSON.parse(raw || '[]') as { name?: string; relation?: string; phone?: string; email?: string }[]; }
  catch { return [] as { name?: string; relation?: string; phone?: string; email?: string }[]; }
}

function parseOtherDocs(raw: string | null | undefined) {
  try { return JSON.parse(raw || '[]') as { name: string; url: string }[]; }
  catch { return [] as { name: string; url: string }[]; }
}

function buildEditFormFields(
  editing: StaffMember,
  bank: { bankName?: string; accountNumber?: string; ifscCode?: string; accountType?: string },
  refs: { name?: string; relation?: string; phone?: string; email?: string }[],
  docs: { name: string; url: string }[]
): BlankEmp {
  return {
    firstName:    editing.firstName ?? '',
    middleName:   editing.middleName ?? '',
    lastName:     editing.lastName ?? '',
    email:        editing.email,
    password:     '',
    role:         editing.role,
    phone:        editing.phone ?? '',
    personalEmail:editing.personalEmail ?? '',
    emergencyContact: editing.emergencyContact ?? '',
    languages:    editing.languages ? editing.languages.split(',').map(l => l.trim()).filter(Boolean) : [],
    homeAddress:  editing.homeAddress ?? '',
    department:   editing.department ?? '',
    departmentEmail: editing.departmentEmail ?? '',
    companyEmail: editing.companyEmail ?? '',
    designation:  editing.designation ?? '',
    joiningDate:  editing.joiningDate ? editing.joiningDate.split('T')[0] : '',
    reportingTo:  editing.reportingTo ?? '',
    responsibleFor: editing.responsibleFor
      ? editing.responsibleFor.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    vehicle:      editing.vehicle ?? '',
    monthlyCTC:   editing.monthlyCTC != null ? String(editing.monthlyCTC) : '',
    yearlyCTC:    editing.yearlyCTC  != null ? String(editing.yearlyCTC)  : '',
    bankName:     bank.bankName ?? '',
    accountNumber:bank.accountNumber ?? '',
    ifscCode:     bank.ifscCode ?? '',
    accountType:  bank.accountType ?? 'Savings',
    profilePhoto: editing.profilePhoto ?? '',
    resumeUrl:    editing.resumeUrl ?? '',
    aadharCardUrl:editing.aadharCardUrl ?? '',
    panCardUrl:   editing.panCardUrl ?? '',
    resignationLetterUrl: editing.resignationLetterUrl ?? '',
    offerLetterUrl: editing.offerLetterUrl ?? '',
    annexureUrl:  editing.annexureUrl ?? '',
    inductionAgreementUrl: editing.inductionAgreementUrl ?? '',
    sopKraUrl:    editing.sopKraUrl ?? '',
    otherDocuments: docs,
    ref1Name:     refs[0]?.name ?? '',
    ref1Relation: refs[0]?.relation ?? '',
    ref1Phone:    refs[0]?.phone ?? '',
    ref1Email:    refs[0]?.email ?? '',
    ref2Name:     refs[1]?.name ?? '',
    ref2Relation: refs[1]?.relation ?? '',
    ref2Phone:    refs[1]?.phone ?? '',
    ref2Email:    refs[1]?.email ?? '',
    linkedinUrl:  editing.linkedinUrl ?? '',
    portfolioUrl: editing.portfolioUrl ?? '',
  };
}

function buildEditForm(editing: StaffMember): BlankEmp {
  const bank = parseBankDetails(editing.bankACDetails);
  const refs = parseRefs(editing.references);
  const docs = parseOtherDocs(editing.otherDocuments);
  return buildEditFormFields(editing, bank, refs, docs);
}

function buildEmpRefs(form: BlankEmp): string {
  return JSON.stringify([
    { name: form.ref1Name, relation: form.ref1Relation, phone: form.ref1Phone, email: form.ref1Email },
    { name: form.ref2Name, relation: form.ref2Relation, phone: form.ref2Phone, email: form.ref2Email },
  ].filter(r => r.name));
}

function buildEmpContactFields(form: BlankEmp) {
  return {
    phone:            form.phone      || null,
    personalEmail:    form.personalEmail    || null,
    emergencyContact: form.emergencyContact || null,
    languages:        form.languages.join(',') || null,
    homeAddress:      form.homeAddress || null,
    department:       form.department  || null,
    departmentEmail:  form.departmentEmail || null,
    companyEmail:     form.companyEmail    || null,
    designation:      form.designation     || null,
    joiningDate:      form.joiningDate     || null,
    reportingTo:      form.reportingTo     || null,
    responsibleFor:   form.responsibleFor.join(',') || null,
    vehicle:          form.vehicle         || null,
  };
}

function buildEmpDocFields(form: BlankEmp) {
  return {
    profilePhoto: form.profilePhoto || null,
    resumeUrl:    form.resumeUrl    || null,
    aadharCardUrl:form.aadharCardUrl|| null,
    panCardUrl:   form.panCardUrl   || null,
    resignationLetterUrl: form.resignationLetterUrl || null,
    offerLetterUrl: form.offerLetterUrl || null,
    annexureUrl:  form.annexureUrl  || null,
    inductionAgreementUrl: form.inductionAgreementUrl || null,
    sopKraUrl:    form.sopKraUrl    || null,
    otherDocuments: form.otherDocuments.length ? JSON.stringify(form.otherDocuments) : null,
    linkedinUrl:  form.linkedinUrl  || null,
    portfolioUrl: form.portfolioUrl || null,
  };
}

function buildEmpPayload(form: BlankEmp, displayName: string, placeholderEmail: string): Record<string, unknown> {
  const refs = buildEmpRefs(form);
  const bank = JSON.stringify({ bankName: form.bankName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, accountType: form.accountType });
  return {
    name:       displayName,
    email:      placeholderEmail,
    role:       'user',
    firstName:  form.firstName  || null,
    middleName: form.middleName || null,
    lastName:   form.lastName   || null,
    ...buildEmpContactFields(form),
    monthlyCTC: form.monthlyCTC ? parseInt(form.monthlyCTC, 10) : null,
    yearlyCTC:  form.yearlyCTC  ? parseInt(form.yearlyCTC,  10) : null,
    bankACDetails: (form.bankName || form.accountNumber) ? bank : null,
    ...buildEmpDocFields(form),
    references: refs !== '[]' ? refs : null,
  };
}

function EmployeeFormModal({ open, onClose, onSaved, editing, staff = [] }: {
  open: boolean; onClose: () => void;
  onSaved: (m: StaffMember) => void; editing?: StaffMember | null;
  staff?: StaffMember[];
}) {
  const [step,   setStep]   = useState<EmpStep>('personal');
  const [form,   setForm]   = useState({ ...BLANK_EMP });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [previewId, setPreviewId] = useState('');

  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setStep('personal'); setError(null); setPreviewId('');
      if (editing) {
        setForm(buildEditForm(editing));
      } else {
        setForm({ ...BLANK_EMP });
      }
    });
  }, [open, editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch employee ID preview when department changes (add mode only)
  useEffect(() => {
    if (isEdit || !form.department) {
      Promise.resolve().then(() => setPreviewId(''));
      return;
    }
    apiClient.get<{ employeeId: string; deptEmail: string }>(
      `/api/auth/generate-employee-id?dept=${form.department}`
    )
      .then(d => setPreviewId(d.employeeId ?? ''))
      .catch(() => setPreviewId(''));
  }, [form.department, isEdit]);

  // Auto-set department email when department changes
  useEffect(() => {
    if (!form.department) return;
    const dept = DEPARTMENTS.find(d => d.code === form.department);
    if (dept) Promise.resolve().then(() => setForm(p => ({ ...p, departmentEmail: dept.email })));
  }, [form.department]);

  const set = (k: keyof typeof BLANK_EMP) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleLang = (lang: string) =>
    setForm(p => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter(l => l !== lang)
        : [...p.languages, lang],
    }));

  const toggleResp = (name: string) =>
    setForm(p => ({
      ...p,
      responsibleFor: p.responsibleFor.includes(name)
        ? p.responsibleFor.filter(n => n !== name)
        : [...p.responsibleFor, name],
    }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const displayName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')
        || `${form.firstName || 'Employee'} ${form.lastName || ''}`.trim();
      if (!displayName) { setError('First Name is required'); setSaving(false); return; }

      const placeholderEmail = isEdit && editing
        ? editing.email
        : `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@noaccess.pravaa.internal`;
      const placeholderPassword = isEdit ? undefined : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const payload = buildEmpPayload(form, displayName, placeholderEmail);
      if (!isEdit && placeholderPassword) payload.password = placeholderPassword;

      const res: StaffMember = isEdit && editing
        ? await apiClient.put<StaffMember>(`/api/auth/users/${editing.id}`, payload)
        : await apiClient.post<StaffMember>('/api/auth/users', payload);

      onSaved(res);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save'));
      setStep('personal');
    } finally {
      setSaving(false);
    }
  };

  const stepIdx = EMP_STEPS.findIndex(s => s.key === step);
  const isLast  = stepIdx === EMP_STEPS.length - 1;
  const prevStep = () => {
    if (stepIdx > 0) { setStep(EMP_STEPS[stepIdx - 1].key); } else { onClose(); }
  };
  const nextStep = () => !isLast && setStep(EMP_STEPS[stepIdx + 1].key);

  return (
    <OsModal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      subtitle="HR Onboarding"
      width={640}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <OsBtn onClick={prevStep} variant="ghost">
            {stepIdx > 0 ? <><ChevronLeft size={13} /> Back</> : 'Cancel'}
          </OsBtn>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLast && <OsBtn onClick={nextStep} variant="default">Next <ChevronRight size={13} /></OsBtn>}
            {isLast  && (
              <OsBtn variant="leaf" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {isEdit ? 'Save Changes' : 'Add Employee'}
              </OsBtn>
            )}
          </div>
        </div>
      }
    >
      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--color-line)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {EMP_STEPS.map((s, i) => {
          const isActive = step === s.key;
          let stepColor = 'var(--color-ink-faint)';
          if (isActive) stepColor = 'white';
          else if (i < stepIdx) stepColor = 'var(--color-leaf)';
          return (
            <button key={s.key} onClick={() => setStep(s.key)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: isActive ? 'var(--color-ink)' : 'transparent',
              color: stepColor,
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
            }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Employee ID badge (add mode only) */}
      {!isEdit && previewId && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-leaf-tint)', border: '1px solid var(--color-leaf)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--color-leaf)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
          <Shield size={12} /> Employee ID: {previewId}
        </div>
      )}
      {isEdit && editing?.employeeId && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-surface-2)', border: '1px solid var(--color-line)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
          <Shield size={12} /> {editing.employeeId}
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--color-terra-tint)', border: '1px solid var(--color-terra-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--color-terra)', display: 'flex', gap: 6, marginBottom: 14 }}>
          <X size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
        </div>
      )}

      {/* ── Step 1: Personal ── */}
      {step === 'personal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="First Name *">
              <input value={form.firstName} onChange={set('firstName')} placeholder="Ravi" style={inputStyle} />
            </Field>
            <Field label="Middle Name">
              <input value={form.middleName} onChange={set('middleName')} placeholder="Kumar" style={inputStyle} />
            </Field>
            <Field label="Last Name *">
              <input value={form.lastName} onChange={set('lastName')} placeholder="Sharma" style={inputStyle} />
            </Field>
          </div>
          <Field label="Profile Photo">
            <PhotoUploadField value={form.profilePhoto} onChange={url => setForm(p => ({ ...p, profilePhoto: url }))} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Phone Number *">
              <input value={form.phone} onChange={set('phone')} placeholder="9876543210" type="tel" maxLength={10} style={inputStyle} />
            </Field>
            <Field label="Personal Email">
              <input value={form.personalEmail} onChange={set('personalEmail')} placeholder="ravi@gmail.com" type="email" style={inputStyle} />
            </Field>
          </div>
          <Field label="Languages Spoken">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {LANG_OPTIONS.map(l => (
                <button key={l} type="button" onClick={() => toggleLang(l)} style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-line)',
                  background: form.languages.includes(l) ? 'var(--color-sky)' : 'var(--color-surface)',
                  color: form.languages.includes(l) ? 'white' : 'var(--color-ink-soft)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Home Address *">
            <textarea value={form.homeAddress} onChange={set('homeAddress')} placeholder="Flat 101, Sunrise Apts, Pune 411001" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Emergency Contact Number">
            <input value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="9999900000" type="tel" maxLength={10} style={inputStyle} />
          </Field>
        </div>
      )}

      {/* ── Step 2: Employment ── */}
      {step === 'employment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Department *">
              <select value={form.department} onChange={set('department')} style={inputStyle}>
                <option value="">Select department…</option>
                {DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.label} ({d.code})</option>)}
              </select>
            </Field>
            <Field label="Allotted Company Department Email">
              <input value={form.departmentEmail} readOnly style={{ ...inputStyle, background: 'var(--color-surface-2)', color: 'var(--color-ink-faint)' }} placeholder="Auto-assigned" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Designation *">
              <input value={form.designation} onChange={set('designation')} placeholder="Senior Gardener" style={inputStyle} />
            </Field>
            <Field label="Date of Joining *">
              <input type="date" value={form.joiningDate} onChange={set('joiningDate')} style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Reporting To">
              <select value={form.reportingTo} onChange={set('reportingTo')} style={inputStyle}>
                <option value="">— None —</option>
                {staff
                  .filter(s => !editing || s.id !== editing.id)
                  .map(s => {
                    const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name;
                    return (
                      <option key={s.id} value={fullName}>
                        {fullName}{s.designation ? ` · ${s.designation}` : ''}
                      </option>
                    );
                  })}
              </select>
            </Field>
            <Field label="Responsible For (Direct Reports)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {staff
                  .filter(s => !editing || s.id !== editing.id)
                  .map(s => {
                    const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name;
                    const selected = form.responsibleFor.includes(fullName);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleResp(fullName)} style={{
                        padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-line)',
                        background: selected ? 'var(--color-sky)' : 'var(--color-surface)',
                        color: selected ? 'white' : 'var(--color-ink-soft)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}>
                        {fullName}
                      </button>
                    );
                  })}
                {staff.filter(s => !editing || s.id !== editing.id).length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>No other staff members yet</span>
                )}
              </div>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Allotted Company Email (if any)">
              <input value={form.companyEmail} onChange={set('companyEmail')} placeholder="ravi.sharma@pravaa.in" type="email" style={inputStyle} />
            </Field>
            <Field label="Vehicle Number (if any)">
              <input value={form.vehicle} onChange={set('vehicle')} placeholder="MH-12 AB 1234" style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 4, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--color-ink-faint)', display: 'flex', gap: 6 }}>
            <Shield size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            System login access is granted separately by the Super Admin via Access Control → Add User.
          </div>
        </div>
      )}

      {/* ── Step 3: Compensation ── */}
      {step === 'compensation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Monthly CTC (₹) *">
              <input type="number" min="0" step="500" value={form.monthlyCTC}
                onChange={e => {
                  const monthly = e.target.value;
                  const yearly = monthly && !isNaN(parseInt(monthly, 10))
                    ? String(parseInt(monthly, 10) * 12) : '';
                  setForm(p => ({ ...p, monthlyCTC: monthly, yearlyCTC: yearly }));
                }}
                placeholder="25000" style={inputStyle} />
            </Field>
            <Field label="Yearly CTC (₹) *">
              <input type="number" min="0" step="1000" value={form.yearlyCTC} onChange={set('yearlyCTC')} placeholder="300000" style={inputStyle} />
            </Field>
          </div>
          <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 14 }}>
            <div style={{ ...monoFaint, marginBottom: 10 }}>BANK ACCOUNT DETAILS *</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={set('bankName')} placeholder="HDFC Bank" style={inputStyle} />
              </Field>
              <Field label="Account Type">
                <select value={form.accountType} onChange={set('accountType')} style={inputStyle}>
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                </select>
              </Field>
              <Field label="Account Number">
                <input value={form.accountNumber} onChange={set('accountNumber')} placeholder="1234567890" style={inputStyle} />
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifscCode} onChange={set('ifscCode')} placeholder="HDFC0001234" style={inputStyle} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Documents ── */}
      {step === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FileUploadField label="Aadhar Card" required value={form.aadharCardUrl} onChange={url => setForm(p => ({ ...p, aadharCardUrl: url }))} accept=".pdf,image/*" />
            <FileUploadField label="PAN Card" required value={form.panCardUrl} onChange={url => setForm(p => ({ ...p, panCardUrl: url }))} accept=".pdf,image/*" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FileUploadField label="Resume" value={form.resumeUrl} onChange={url => setForm(p => ({ ...p, resumeUrl: url }))} accept=".pdf,.doc,.docx" />
            <FileUploadField label="Resignation Letter (prev employer)" value={form.resignationLetterUrl} onChange={url => setForm(p => ({ ...p, resignationLetterUrl: url }))} accept=".pdf,image/*" />
          </div>
          <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 12 }}>
            <div style={{ ...monoFaint, marginBottom: 10 }}>PRAVAA DOCUMENTS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FileUploadField label="Signed Offer-cum-Appointment Letter" value={form.offerLetterUrl} onChange={url => setForm(p => ({ ...p, offerLetterUrl: url }))} accept=".pdf,image/*" />
              <FileUploadField label="Signed Annexure" value={form.annexureUrl} onChange={url => setForm(p => ({ ...p, annexureUrl: url }))} accept=".pdf,image/*" />
              <FileUploadField label="Signed Induction Agreement" value={form.inductionAgreementUrl} onChange={url => setForm(p => ({ ...p, inductionAgreementUrl: url }))} accept=".pdf,image/*" />
              <FileUploadField label="SOP / KPA / KPI / KRA / JD" value={form.sopKraUrl} onChange={url => setForm(p => ({ ...p, sopKraUrl: url }))} accept=".pdf,.doc,.docx" />
            </div>
          </div>
          <Field label="References">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid var(--color-line)', borderRadius: 8, padding: 12 }}>
                <div style={{ ...monoFaint, marginBottom: 8 }}>REFERENCE 1</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={form.ref1Name} onChange={set('ref1Name')} placeholder="Name" style={inputStyle} />
                  <input value={form.ref1Relation} onChange={set('ref1Relation')} placeholder="Relation" style={inputStyle} />
                  <input value={form.ref1Phone} onChange={set('ref1Phone')} placeholder="Phone" style={inputStyle} />
                  <input value={form.ref1Email} onChange={set('ref1Email')} placeholder="Email" style={inputStyle} />
                </div>
              </div>
              <div style={{ border: '1px solid var(--color-line)', borderRadius: 8, padding: 12 }}>
                <div style={{ ...monoFaint, marginBottom: 8 }}>REFERENCE 2</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={form.ref2Name} onChange={set('ref2Name')} placeholder="Name" style={inputStyle} />
                  <input value={form.ref2Relation} onChange={set('ref2Relation')} placeholder="Relation" style={inputStyle} />
                  <input value={form.ref2Phone} onChange={set('ref2Phone')} placeholder="Phone" style={inputStyle} />
                  <input value={form.ref2Email} onChange={set('ref2Email')} placeholder="Email" style={inputStyle} />
                </div>
              </div>
            </div>
          </Field>
        </div>
      )}

      {/* ── Step 5: Online Presence ── */}
      {step === 'online' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="LinkedIn URL (if any)">
            <input value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/ravi-sharma" type="url" style={inputStyle} />
          </Field>
          <Field label="Portfolio URL (if any)">
            <input value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://ravikumar.design" type="url" style={inputStyle} />
          </Field>

          {/* Summary card */}
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
            <div style={{ ...monoFaint, marginBottom: 10 }}>EMPLOYEE SUMMARY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={[form.firstName, form.lastName].filter(Boolean).join(' ') || 'New Employee'} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {[form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || '—'}
                </div>
                <div style={{ ...monoFaint, fontSize: 10, marginTop: 2 }}>
                  {ROLE_META[form.role as keyof typeof ROLE_META]?.label ?? form.role} · {form.designation || 'No designation'}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {previewId && !isEdit && <Pill variant="leaf">{previewId}</Pill>}
                  {form.department && <Pill variant="sky">{form.department}</Pill>}
                  {form.monthlyCTC && <Pill variant="gold">₹{parseInt(form.monthlyCTC).toLocaleString('en-IN')}/mo</Pill>}
                  {form.languages.map(l => <Pill key={l} variant="neutral">{l}</Pill>)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--color-leaf-tint)', borderRadius: 8, fontSize: 12, color: 'var(--color-leaf)', display: 'flex', gap: 6 }}>
            <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {isEdit ? 'Click Save Changes to update the employee record.' : 'Click Add Employee to complete onboarding and create system access.'}
          </div>
        </div>
      )}
    </OsModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add User Modal — Access Control (grant system access, link by Employee ID)
// ─────────────────────────────────────────────────────────────────────────────

function AddUserModal({ open, onClose, onSaved, staff }: {
  open: boolean; onClose: () => void; onSaved: (m: StaffMember) => void;
  staff: StaffMember[];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [role,     setRole]     = useState('user');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Only show employees that don't have real access yet
  const noAccessStaff = staff.filter(s => isPlaceholderEmail(s.email));
  const selected = staff.find(s => s.id === selectedId) ?? null;

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setSelectedId(''); setRole('user'); setEmail(''); setPassword(''); setError(null);
      });
    }
  }, [open]);

  // Auto-fill email when selecting an employee who has a personal email
  useEffect(() => {
    if (selected?.personalEmail && !email) Promise.resolve().then(() => setEmail(selected.personalEmail!));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selectedId)        { setError('Select an employee'); return; }
    if (!email.trim())      { setError('Login email is required'); return; }
    if (password.length < 6){ setError('Password must be at least 6 characters'); return; }
    setSaving(true); setError(null);
    try {
      const res: StaffMember = await apiClient.put<StaffMember>(`/api/auth/users/${selectedId}`, {
        email:    email.trim(),
        password: password,
        role,
      });
      onSaved(res);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to grant access'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OsModal open={open} onClose={onClose} title="Grant System Access" subtitle="Access Control → Add User"
      footer={<>
        <OsBtn onClick={onClose}>Cancel</OsBtn>
        <OsBtn variant="leaf" onClick={handleSave} disabled={saving || !selectedId}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
          Grant Access
        </OsBtn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ background: 'var(--color-terra-tint)', border: '1px solid var(--color-terra-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--color-terra)', display: 'flex', gap: 6 }}>
            <X size={13} /> {error}
          </div>
        )}

        <Field label="Select Employee *">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Select an employee —</option>
            {noAccessStaff.length > 0
              ? noAccessStaff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.employeeId ? `${s.employeeId} · ` : ''}{s.name}{s.designation ? ` — ${s.designation}` : ''}{s.department ? ` (${s.department})` : ''}
                  </option>
                ))
              : staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.employeeId ? `${s.employeeId} · ` : ''}{s.name}{s.designation ? ` — ${s.designation}` : ''}
                  </option>
                ))
            }
          </select>
          {noAccessStaff.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 3 }}>
              All employees already have system access.
            </div>
          )}
        </Field>

        {selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-leaf-tint)', border: '1px solid var(--color-leaf)', borderRadius: 10, padding: '10px 14px' }}>
            <Avatar name={selected.name} size={36} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>{selected.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-leaf)' }}>
                {selected.employeeId} · {selected.designation || 'Employee'} {selected.department ? `· ${selected.department}` : ''}
              </div>
            </div>
          </div>
        )}

        <Field label="Role (Access Level) *">
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            {Object.entries(ROLE_META).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>
        <Field label="Login Email *">
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="ravi@pravaa.in" style={inputStyle} />
        </Field>
        <Field label="Password *">
          <div style={{ position: 'relative' }}>
            <input type={showPwd ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters" style={{ ...inputStyle, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-faint)', display: 'flex' }}>
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
        <div style={{ padding: '10px 12px', background: 'rgba(176,136,56,0.06)', border: '1px solid rgba(176,136,56,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--color-gold)', display: 'flex', gap: 6 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          Login is email + password only. Gmail connects Google Calendar separately.
        </div>
      </div>
    </OsModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark Attendance Modal
// ─────────────────────────────────────────────────────────────────────────────

function buildAttendanceForm(existing: AttendanceRecord) {
  return {
    userId:      existing.userId,
    date:        existing.date ? existing.date.split('T')[0] : '',
    status:      existing.status,
    checkIn:     existing.checkIn  ? new Date(existing.checkIn).toTimeString().slice(0,5)  : '',
    checkOut:    existing.checkOut ? new Date(existing.checkOut).toTimeString().slice(0,5) : '',
    hoursWorked: existing.hoursWorked != null ? String(existing.hoursWorked) : '',
    gpsVerified: existing.gpsVerified,
    notes:       existing.notes ?? '',
  };
}

function AttendanceModal({ open, onClose, onSaved, staff, existing, defaultUserId, defaultDate }: {
  open: boolean; onClose: () => void;
  onSaved: (r: AttendanceRecord) => void;
  staff: StaffMember[];
  existing?: AttendanceRecord | null;
  defaultUserId?: string;
  defaultDate?: string;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    userId: defaultUserId ?? '',
    date: defaultDate ?? today,
    status: 'present' as AttendanceStatus,
    checkIn: '',
    checkOut: '',
    hoursWorked: '',
    gpsVerified: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setError(null);
      if (existing) {
        setForm(buildAttendanceForm(existing));
      } else {
        setForm(p => ({ ...p, userId: defaultUserId ?? '', date: defaultDate ?? today, status: 'present', checkIn: '', checkOut: '', hoursWorked: '', gpsVerified: false, notes: '' }));
      }
    });
  }, [open, existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = {
        userId:      form.userId,
        date:        form.date,
        status:      form.status,
        gpsVerified: form.gpsVerified,
        notes:       form.notes || null,
      };
      if (form.checkIn)     payload.checkIn  = `${form.date}T${form.checkIn}:00`;
      if (form.checkOut)    payload.checkOut = `${form.date}T${form.checkOut}:00`;
      if (form.hoursWorked) payload.hoursWorked = parseFloat(form.hoursWorked);

      let rec: AttendanceRecord;
      if (existing) {
        rec = await apiClient.put<AttendanceRecord>(`/api/attendance/${existing.id}`, payload);
      } else {
        rec = await apiClient.post<AttendanceRecord>('/api/attendance', payload);
      }
      onSaved(rec);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OsModal open={open} onClose={onClose}
      title={existing ? 'Edit Attendance' : 'Mark Attendance'}
      subtitle="HR · Attendance"
      footer={<>
        <OsBtn onClick={onClose}>Cancel</OsBtn>
        <OsBtn variant="leaf" onClick={() => formRef.current?.requestSubmit()} disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {existing ? 'Update' : 'Save'}
        </OsBtn>
      </>}
    >
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ background: 'var(--color-terra-tint)', border: '1px solid var(--color-terra-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--color-terra)', display: 'flex', gap: 6 }}>
            <X size={13} /> {error}
          </div>
        )}
        <div>
          <label style={labelStyle}>Staff Member</label>
          <select value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} required style={inputStyle} disabled={!!existing}>
            <option value="">Select staff…</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {ROLE_META[s.role]?.label ?? s.role}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required style={inputStyle} disabled={!!existing} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))} style={inputStyle}>
            {(Object.keys(STATUS_META) as AttendanceStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
        {(form.status === 'present' || form.status === 'half-day') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Check-in time</label>
              <input type="time" value={form.checkIn} onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Check-out time</label>
              <input type="time" value={form.checkOut} onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))} style={inputStyle} />
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Hours Worked (optional)</label>
          <input type="number" step="0.5" min="0" max="24" value={form.hoursWorked} onChange={e => setForm(p => ({ ...p, hoursWorked: e.target.value }))} placeholder="e.g. 8.5" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="gps" checked={form.gpsVerified} onChange={e => setForm(p => ({ ...p, gpsVerified: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--color-leaf)' }} />
          <label htmlFor="gps" style={{ fontSize: 13, color: 'var(--color-ink-soft)', cursor: 'pointer' }}>GPS verified</label>
        </div>
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any remarks…" style={inputStyle} />
        </div>
      </form>
    </OsModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance Edit Modal
// ─────────────────────────────────────────────────────────────────────────────

function PerfModal({ open, onClose, onSaved, staff, existing, defaultUserId, month, year }: {
  open: boolean; onClose: () => void;
  onSaved: (r: PerfRecord) => void;
  staff: StaffMember[];
  existing?: PerfRecord | null;
  defaultUserId?: string;
  month: number; year: number;
}) {
  const [form, setForm] = useState({ userId: defaultUserId ?? '', qualityScore: '', survivalPct: '', sitesCount: '', onTimePct: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setError(null);
      if (existing) {
        setForm({ userId: existing.userId, qualityScore: String(existing.qualityScore), survivalPct: String(existing.survivalPct), sitesCount: String(existing.sitesCount), onTimePct: String(existing.onTimePct), notes: existing.notes ?? '' });
      } else {
        setForm({ userId: defaultUserId ?? '', qualityScore: '', survivalPct: '', sitesCount: '', onTimePct: '', notes: '' });
      }
    });
  }, [open, existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = { userId: form.userId, month, year, qualityScore: form.qualityScore, survivalPct: form.survivalPct, sitesCount: form.sitesCount, onTimePct: form.onTimePct, notes: form.notes || null };
      const rec: PerfRecord = existing
        ? await apiClient.put<PerfRecord>(`/api/staff-performance/${existing.id}`, payload)
        : await apiClient.post<PerfRecord>('/api/staff-performance', payload);
      onSaved(rec);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  const nf = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value })) });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <OsModal open={open} onClose={onClose}
      title={existing ? 'Edit Performance' : 'Record Performance'}
      subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
      footer={<>
        <OsBtn onClick={onClose}>Cancel</OsBtn>
        <OsBtn variant="leaf" onClick={() => formRef.current?.requestSubmit()} disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Save
        </OsBtn>
      </>}
    >
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ background: 'var(--color-terra-tint)', border: '1px solid var(--color-terra-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--color-terra)', display: 'flex', gap: 6 }}><X size={13} /> {error}</div>}
        {!existing && (
          <div>
            <label style={labelStyle}>Staff Member</label>
            <select value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} required style={inputStyle}>
              <option value="">Select staff…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {[
          { k: 'qualityScore' as const, label: 'Quality Score (0–100)', placeholder: '85' },
          { k: 'survivalPct'  as const, label: 'Plant Survival %',       placeholder: '92.5' },
          { k: 'sitesCount'   as const, label: 'Sites Covered',           placeholder: '6' },
          { k: 'onTimePct'    as const, label: 'On-Time %',               placeholder: '95' },
        ].map(f => (
          <div key={f.k}>
            <label style={labelStyle}>{f.label}</label>
            <input type="number" step="0.1" min="0" max="100" {...nf(f.k)} placeholder={f.placeholder} required style={inputStyle} />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Notes</label>
          <input type="text" {...nf('notes')} placeholder="Any remarks…" style={inputStyle} />
        </div>
      </form>
    </OsModal>
  );
}

function AttendanceDateCell({ staffId, date, attMap, isSuperAdmin, openMarkAtt }: {
  staffId: string; date: Date;
  attMap: Map<string, AttendanceRecord>;
  isSuperAdmin: boolean;
  openMarkAtt: (userId: string, dateStr: string, existing?: AttendanceRecord) => void;
}) {
  const dateStr = date.toISOString().split('T')[0];
  const rec = attMap.get(`${staffId}::${dateStr}`);
  const sm  = rec ? STATUS_META[rec.status] : null;
  const isToday = dateStr === new Date().toISOString().split('T')[0];
  const cellBg = isToday ? 'rgba(var(--color-leaf-rgb, 47,90,58),0.04)' : 'transparent';
  return (
    <td key={date.getDate()} style={{ padding: 2, textAlign: 'center', verticalAlign: 'middle', background: cellBg }}>
      {sm ? (
        <div
          title={[sm.label, rec?.checkIn ? ('In: ' + fmtTime(rec.checkIn)) : '', rec?.checkOut ? ('Out: ' + fmtTime(rec.checkOut)) : ''].filter(Boolean).join(' · ')}
          onClick={() => isSuperAdmin && openMarkAtt(staffId, dateStr, rec)}
          style={{ width: 26, height: 26, borderRadius: 6, background: sm.bg, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sm.color, cursor: isSuperAdmin ? 'pointer' : 'default' }}
        >
          {sm.icon}
        </div>
      ) : (
        <div
          onClick={() => isSuperAdmin && openMarkAtt(staffId, dateStr)}
          style={{ width: 26, height: 26, borderRadius: 6, border: '1px dashed var(--color-line)', margin: '0 auto', cursor: isSuperAdmin ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isSuperAdmin ? 'Click to mark' : ''}
        >
          <span style={{ color: 'var(--color-line)', fontSize: 10 }}>·</span>
        </div>
      )}
    </td>
  );
}

function validateAcEditForm(form: { password: string; confirmPassword: string }): string | null {
  if (form.password && form.password !== form.confirmPassword) return 'Passwords do not match';
  if (form.password && form.password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

function computeAttendancePct(staff: StaffMember[], attSummary: AttendanceSummary, attYear: number, attMonth: number): number {
  const totalPresent = Object.values(attSummary).reduce((s, v) => s + v.present, 0);
  const totalDays = datesInMonth(attYear, attMonth).length;
  if (!staff.length || !totalDays) return 0;
  return Math.round((totalPresent / (staff.length * totalDays)) * 100);
}

function normalizeStaffList(res: StaffMember[] | { users?: StaffMember[]; data?: StaffMember[] }): StaffMember[] {
  return Array.isArray(res) ? res : (res.users ?? res.data ?? []);
}

function upsertById<T extends { id: string }>(prev: T[], record: T): T[] {
  const idx = prev.findIndex(r => r.id === record.id);
  if (idx >= 0) { const n = [...prev]; n[idx] = record; return n; }
  return [...prev, record];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffHR() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const role         = currentUser?.role ?? 'user';
  const isSuperAdmin = role === 'super-admin';

  // ── Navigation state ──────────────────────────────────────────────────────
  const [tab,        setTab]        = useState('roster');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [staff,       setStaff]      = useState<StaffMember[]>([]);
  const [attendance,  setAttendance] = useState<AttendanceRecord[]>([]);
  const [perfData,    setPerfData]   = useState<PerfRecord[]>([]);
  const [attSummary,  setAttSummary] = useState<AttendanceSummary>({});

  // ── Loading ────────────────────────────────────────────────────────────────
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAtt,   setLoadingAtt]   = useState(false);
  const [loadingPerf,  setLoadingPerf]  = useState(false);

  // ── Filter state (Roster) ─────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // ── Attendance sheet state ────────────────────────────────────────────────
  const now = new Date();
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear,  setAttYear]  = useState(now.getFullYear());
  const [attView,  setAttView]  = useState<'calendar' | 'list'>('calendar');

  // ── Performance month ─────────────────────────────────────────────────────
  const [perfMonth, setPerfMonth] = useState(now.getMonth() + 1);
  const [perfYear,  setPerfYear]  = useState(now.getFullYear());

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showStaffForm, setShowStaffForm]   = useState(false);
  const [editStaff,     setEditStaff]       = useState<StaffMember | null>(null);
  const [showAddUser,   setShowAddUser]     = useState(false);
  const [showAttModal,  setShowAttModal]    = useState(false);
  const [editAttRecord, setEditAttRecord]   = useState<AttendanceRecord | null>(null);
  const [attDefaultUser, setAttDefaultUser] = useState('');
  const [attDefaultDate, setAttDefaultDate] = useState('');
  const [showPerfModal, setShowPerfModal]   = useState(false);
  const [editPerfRecord, setEditPerfRecord] = useState<PerfRecord | null>(null);
  const [perfDefaultUser, setPerfDefaultUser] = useState('');

  // ── Access Control state ──────────────────────────────────────────────────
  const [expandedAcRole, setExpandedAcRole] = useState<string | null>(null);
  const [acSuccessMsg, setAcSuccessMsg]     = useState('');
  const [acEditUser, setAcEditUser]         = useState<StaffMember | null>(null);
  const [acEditForm, setAcEditForm]         = useState({ name: '', email: '', role: '', password: '', confirmPassword: '' });
  const [acEditSaving, setAcEditSaving]     = useState(false);
  const [acEditError, setAcEditError]       = useState<string | null>(null);
  const [acEditPwdVisible, setAcEditPwdVisible] = useState(false);

  // ── Fetch staff ───────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await apiClient.get<StaffMember[] | { users?: StaffMember[]; data?: StaffMember[] }>('/api/auth/users');
      const list = normalizeStaffList(res);
      setStaff(list);
      if (!selectedId && list.length) setSelectedId(list[0].id);
    } catch { setStaff([]); }
    finally { setLoadingStaff(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch attendance ──────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async (month: number, year: number) => {
    setLoadingAtt(true);
    try {
      const [records, summary] = await Promise.all([
        apiClient.get<AttendanceRecord[]>(`/api/attendance?month=${month}&year=${year}`),
        apiClient.get<AttendanceSummary>(`/api/attendance/summary?month=${month}&year=${year}`),
      ]);
      setAttendance(records);
      setAttSummary(summary);
    } catch { setAttendance([]); setAttSummary({}); }
    finally { setLoadingAtt(false); }
  }, []);

  // ── Fetch performance ─────────────────────────────────────────────────────
  const fetchPerf = useCallback(async (month: number, year: number) => {
    setLoadingPerf(true);
    try {
      const res = await apiClient.get<PerfRecord[]>(`/api/staff-performance?month=${month}&year=${year}`);
      setPerfData(res);
    } catch { setPerfData([]); }
    finally { setLoadingPerf(false); }
  }, []);

  useEffect(() => { Promise.resolve().then(() => fetchStaff()); }, [fetchStaff]);
  useEffect(() => { if (tab === 'attendance') Promise.resolve().then(() => fetchAttendance(attMonth, attYear)); }, [tab, attMonth, attYear, fetchAttendance]);
  useEffect(() => { if (tab === 'performance') Promise.resolve().then(() => fetchPerf(perfMonth, perfYear)); }, [tab, perfMonth, perfYear, fetchPerf]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const counts = {
    total:    staff.length,
    admins:   staff.filter(s => ['super-admin', 'admin'].includes(s.role)).length,
    managers: staff.filter(s => s.role === 'manager').length,
    field:    staff.filter(s => s.role === 'user').length,
  };

  const totalDays     = datesInMonth(attYear, attMonth).length;
  const attendancePct = computeAttendancePct(staff, attSummary, attYear, attMonth);

  const avgQuality = perfData.length
    ? Math.round(perfData.reduce((s, r) => s + r.qualityScore, 0) / perfData.length)
    : 0;

  const current     = staff.find(s => s.id === selectedId) ?? staff[0] ?? null;
  const currentPerf = current ? perfData.find(r => r.userId === current.id) ?? null : null;
  const currentSummary = current ? attSummary[current.id] ?? null : null;

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      && (filterRole === 'all' || s.role === filterRole);
  });

  const TABS = [
    { key: 'roster',         label: 'Roster',         count: counts.total },
    { key: 'attendance',     label: 'Attendance'                          },
    { key: 'performance',    label: 'Performance'                         },
    { key: 'profile',        label: 'Profile'                             },
    { key: 'org-chart',      label: 'Org Chart'                           },
    ...(isSuperAdmin ? [{ key: 'access-control', label: 'Access Control' }] : []),
  ];

  // ── Attendance helpers ────────────────────────────────────────────────────
  const attMap = new Map<string, AttendanceRecord>();
  attendance.forEach(r => { if (r.date) attMap.set(`${r.userId}::${r.date.split('T')[0]}`, r); });

  const openMarkAtt = (userId: string, date: string, existing?: AttendanceRecord) => {
    setAttDefaultUser(userId);
    setAttDefaultDate(date);
    setEditAttRecord(existing ?? null);
    setShowAttModal(true);
  };

  const handleAttSaved = (rec: AttendanceRecord) => {
    setAttendance(prev => upsertById(prev, rec));
    fetchAttendance(attMonth, attYear); // refresh summary
    toast({ title: 'Attendance saved', variant: 'success' });
  };

  const handleAttDelete = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await apiClient.delete(`/api/attendance/${id}`);
      setAttendance(prev => prev.filter(r => r.id !== id));
      fetchAttendance(attMonth, attYear);
      toast({ title: 'Record deleted', variant: 'success' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'error' });
    }
  };

  // ── Staff CRUD ────────────────────────────────────────────────────────────
  const handleStaffSaved = (m: StaffMember) => {
    setStaff(prev => upsertById(prev, m));
    toast({ title: editStaff ? `${m.name} updated` : `${m.name} added`, variant: 'success' });
  };

  const handleStaffDelete = async (m: StaffMember) => {
    if (!confirm(`Remove ${m.name}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/api/auth/users/${m.id}`);
      setStaff(prev => prev.filter(s => s.id !== m.id));
      if (selectedId === m.id) setSelectedId(staff.find(s => s.id !== m.id)?.id ?? null);
      toast({ title: `${m.name} removed`, variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'Cannot remove', body: getErrorMessage(err, 'Failed to remove'), variant: 'error' });
    }
  };

  // ── Performance CRUD ──────────────────────────────────────────────────────
  const handlePerfSaved = (r: PerfRecord) => {
    setPerfData(prev => upsertById(prev, r));
    toast({ title: 'Performance saved', variant: 'success' });
  };

  // ── Access Control helpers ────────────────────────────────────────────────
  const flashAc = (msg: string) => {
    setAcSuccessMsg(msg);
    setTimeout(() => setAcSuccessMsg(''), 3500);
  };


  const handleAcEditSave = async () => {
    if (!acEditUser) return;
    const acValidError = validateAcEditForm(acEditForm);
    if (acValidError) { setAcEditError(acValidError); return; }
    setAcEditSaving(true); setAcEditError(null);
    try {
      const payload: Record<string, string> = { name: acEditForm.name, email: acEditForm.email, role: acEditForm.role };
      if (acEditForm.password) payload.password = acEditForm.password;
      const updated = await apiClient.put<StaffMember>(`/api/auth/users/${acEditUser.id}`, payload);
      setStaff(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setAcEditUser(null);
      flashAc('User updated successfully.');
    } catch (err: unknown) {
      setAcEditError(getErrorMessage(err, 'Failed to update user'));
    } finally {
      setAcEditSaving(false);
    }
  };

  // ── Month nav helpers ─────────────────────────────────────────────────────
  const prevMonth = (m: number, y: number) => m === 1 ? [12, y - 1] : [m - 1, y];
  const nextMonth = (m: number, y: number) => m === 12 ? [1, y + 1] : [m + 1, y];

  // ── Access Users Card ─────────────────────────────────────────────────────
  const renderAccessUsersCard = () => {
    const accessUsers = staff.filter(s => !isPlaceholderEmail(s.email));
    return (
      <OsCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="var(--color-ink-faint)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Users with System Access</span>
          </div>
          <OsBtn size="sm" variant="leaf" onClick={() => setShowAddUser(true)}>
            <Plus size={12} /> Grant Access
          </OsBtn>
        </div>
        {accessUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-ink-faint)' }}>
            <Lock size={32} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16 }}>No users with system access yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Grant access to employees via the button above.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Employee', 'Login Email', 'Role', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', ...monoFaint, padding: '8px 12px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accessUsers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-line)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={s.name} size={28} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        {s.employeeId && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-leaf)' }}>{s.employeeId}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', ...monoFaint, fontSize: 11, verticalAlign: 'middle' }}>{s.email}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(s.role)}`}>{getRoleLabel(s.role)}</span>
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <OsBtn size="sm" variant="ghost" onClick={() => { setAcEditUser(s); setAcEditForm({ name: s.name, email: s.email, role: s.role, password: '', confirmPassword: '' }); }}>
                      <Pencil size={11} /> Edit
                    </OsBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </OsCard>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <PageHeader
        title="Staff & HR"
        description={`${counts.total} team members`}
        actions={isSuperAdmin ? (
          <OsBtn variant="leaf" onClick={() => { setEditStaff(null); setShowStaffForm(true); }}>
            <Plus size={13} /> Add Employee
          </OsBtn>
        ) : undefined}
      />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KPI label="Total Staff"     value={counts.total}                     />
        <KPI label="Field Staff"     value={counts.field}     variant="leaf"  />
        <KPI label="Attendance (mo)" value={`${attendancePct}%`} variant="leaf" />
        <KPI label="Avg Quality"     value={avgQuality || '—'} variant="gold" />
      </div>

      <OsTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ══════════════════════════════════════════════════════════════════
          ROSTER TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'roster' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '7px 12px', flex: '1 1 200px', maxWidth: 300 }}>
              <Search size={14} color="var(--color-ink-faint)" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…" style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 13, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-ui)' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-faint)', display: 'flex' }}><X size={13} /></button>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all', ...Object.keys(ROLE_META)].map(r => {
                const isActive = filterRole === r;
                const btnBg = isActive ? 'var(--color-ink)' : 'var(--color-surface)';
                const btnColor = isActive ? 'white' : 'var(--color-ink-soft)';
                const btnLabel = r === 'all' ? 'All' : ROLE_META[r]?.label ?? r;
                return (
                  <button key={r} onClick={() => setFilterRole(r)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-line)', background: btnBg, color: btnColor, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.12s' }}>
                    {btnLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <OsCard>
            {loadingStaff ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-leaf)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-ink-faint)' }}>
                <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20 }}>No staff found</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Member', 'Employee ID', 'Role', 'Email', 'Joined', ...(isSuperAdmin ? ['Actions'] : [])].map(h => (
                      <th key={h} style={{ textAlign: 'left', ...monoFaint, padding: '10px 14px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((m, i) => {
                      const rm = ROLE_META[m.role] ?? { label: m.role, pill: 'neutral' as const };
                      return (
                        <motion.tr key={m.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03 }}
                          style={{ borderBottom: '1px solid var(--color-line)', cursor: 'pointer' }}
                          onClick={() => { setSelectedId(m.id); setTab('profile'); }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar name={m.name} size={32} />
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: 13.5 }}>{m.name}</div>
                                {m.id === currentUser?.id && <span style={{ ...monoFaint, color: 'var(--color-leaf)' }}>YOU</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            {m.employeeId && <span style={{ ...monoFaint, fontSize: 11, color: 'var(--color-leaf)' }}>{m.employeeId}</span>}
                            {!m.employeeId && <span style={{ ...monoFaint, fontSize: 10, color: 'var(--color-ink-faint)' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <Pill variant={rm.pill} dot>{rm.label}</Pill>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', ...monoFaint, fontSize: 11 }}>
                            {isPlaceholderEmail(m.email) && <span style={{ color: 'var(--color-ink-faint)', fontStyle: 'italic' }}>No access</span>}
                            {!isPlaceholderEmail(m.email) && m.email}
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', ...monoFaint, fontSize: 11 }}>{fmtDate(m.createdAt)}</td>
                          {isSuperAdmin && (
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle' }} role="presentation" onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => { setEditStaff(m); setShowStaffForm(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ui)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                  <Pencil size={12} /> Edit
                                </button>
                                {m.id !== currentUser?.id && (
                                  <button onClick={() => handleStaffDelete(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ui)' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-terra-tint)'; e.currentTarget.style.color = 'var(--color-terra)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-ink-faint)'; }}>
                                    <Trash2 size={12} /> Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </OsCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ATTENDANCE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '6px 10px' }}>
              <button onClick={() => { const [m, y] = prevMonth(attMonth, attYear); setAttMonth(m); setAttYear(y); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', display: 'flex' }}><ChevronLeft size={14} /></button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink)', minWidth: 80, textAlign: 'center' }}>{MONTH_NAMES[attMonth - 1]} {attYear}</span>
              <button onClick={() => { const [m, y] = nextMonth(attMonth, attYear); setAttMonth(m); setAttYear(y); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', display: 'flex' }}><ChevronRight size={14} /></button>
            </div>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: 3 }}>
              {(['calendar', 'list'] as const).map(v => {
                const isActive = attView === v;
                return (
                  <button key={v} onClick={() => setAttView(v)} style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: isActive ? 'var(--color-ink)' : 'transparent', color: isActive ? 'white' : 'var(--color-ink-soft)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.1s' }}>
                    {v === 'calendar' ? 'Grid' : 'List'}
                  </button>
                );
              })}
            </div>
            {isSuperAdmin && (
              <OsBtn variant="leaf" size="sm" onClick={() => { setAttDefaultUser(''); setAttDefaultDate(new Date().toISOString().split('T')[0]); setEditAttRecord(null); setShowAttModal(true); }}>
                <Plus size={12} /> Mark Attendance
              </OsBtn>
            )}
          </div>

          {/* Summary pills */}
          {Object.keys(attSummary).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {staff.map(s => {
                const sum = attSummary[s.id];
                if (!sum) return null;
                const pct = Math.round((sum.present + sum.halfDay * 0.5) / totalDays * 100);
                const pctColor = attendanceColor(pct);
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 8, padding: '6px 10px' }}>
                    <Avatar name={s.name} size={20} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)' }}>{s.name.split(' ')[0]}</span>
                    <span style={{ ...monoFaint, color: pctColor }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {loadingAtt && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-leaf)' }} />
            </div>
          )}
          {!loadingAtt && attView === 'calendar' && (
            /* ── Calendar / Grid view ── */
            <OsCard>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ ...monoFaint, padding: '10px 12px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', textAlign: 'left', width: 140 }}>Staff</th>
                      {datesInMonth(attYear, attMonth).map(d => (
                        <th key={d.getDate()} style={{ ...monoFaint, padding: '6px 4px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', textAlign: 'center', minWidth: 32, fontSize: 9 }}>
                          <div>{d.getDate()}</div>
                          <div style={{ color: 'var(--color-line)', fontSize: 8 }}>{['S','M','T','W','T','F','S'][d.getDay()]}</div>
                        </th>
                      ))}
                      <th style={{ ...monoFaint, padding: '10px 8px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', textAlign: 'center' }}>P</th>
                      <th style={{ ...monoFaint, padding: '10px 8px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', textAlign: 'center' }}>A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => {
                      const sum = attSummary[s.id];
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--color-line)' }}>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar name={s.name} size={22} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{s.name.split(' ')[0]}</span>
                            </div>
                          </td>
                          {datesInMonth(attYear, attMonth).map(d => (
                            <AttendanceDateCell key={d.getDate()} staffId={s.id} date={d} attMap={attMap} isSuperAdmin={isSuperAdmin} openMarkAtt={openMarkAtt} />
                          ))}
                          <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-leaf)', fontWeight: 700 }}>{sum?.present ?? 0}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-terra)' }}>{sum?.absent ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 0 2px', borderTop: '1px solid var(--color-line)', marginTop: 8 }}>
                {(Object.keys(STATUS_META) as AttendanceStatus[]).map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: STATUS_META[s].bg, border: `1px solid ${STATUS_META[s].color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: STATUS_META[s].color }}>
                      {STATUS_META[s].icon}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-ink-soft)' }}>{STATUS_META[s].label}</span>
                  </div>
                ))}
              </div>
            </OsCard>
          )}
          {!loadingAtt && attView !== 'calendar' && (
            /* ── List view ── */
            <OsCard>
              {attendance.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-ink-faint)' }}>
                  <CalendarDays size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>No records for {MONTH_NAMES[attMonth - 1]} {attYear}</div>
                  {isSuperAdmin && <div style={{ fontSize: 12, marginTop: 6 }}>Click &quot;Mark Attendance&quot; above to add records.</div>}
                </div>
              )}
              {attendance.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Staff', 'Date', 'Status', 'Check-in', 'Check-out', 'Hours', 'GPS', ...(isSuperAdmin ? [''] : [])].map(h => (
                        <th key={h} style={{ textAlign: 'left', ...monoFaint, padding: '10px 14px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-surface-2)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec, i) => {
                      const member = staff.find(s => s.id === rec.userId);
                      const sm = STATUS_META[rec.status];
                      return (
                        <motion.tr key={rec.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--color-line)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {member && <Avatar name={member.name} size={26} />}
                              <span style={{ fontWeight: 500 }}>{member?.name ?? rec.userId}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', ...monoFaint, fontSize: 11, verticalAlign: 'middle' }}>{fmtDate(rec.date)}</td>
                          <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 500 }}>
                              {sm.icon} {sm.label}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', ...monoFaint, fontSize: 11, verticalAlign: 'middle' }}>{fmtTime(rec.checkIn)}</td>
                          <td style={{ padding: '10px 14px', ...monoFaint, fontSize: 11, verticalAlign: 'middle' }}>{fmtTime(rec.checkOut)}</td>
                          <td style={{ padding: '10px 14px', ...monoFaint, fontSize: 11, verticalAlign: 'middle' }}>{rec.hoursWorked != null ? `${rec.hoursWorked}h` : '—'}</td>
                          <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                            {rec.gpsVerified ? <span style={{ color: 'var(--color-leaf)', fontSize: 11 }}>✓ GPS</span> : <span style={{ color: 'var(--color-ink-faint)', fontSize: 11 }}>—</span>}
                          </td>
                          {isSuperAdmin && (
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => openMarkAtt(rec.userId, rec.date ? rec.date.split('T')[0] : '', rec)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ui)' }}><Pencil size={11} /></button>
                                <button onClick={() => handleAttDelete(rec.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--color-ink-faint)', fontFamily: 'var(--font-ui)' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-terra)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-faint)'; }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </OsCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PERFORMANCE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '6px 10px' }}>
              <button onClick={() => { const [m, y] = prevMonth(perfMonth, perfYear); setPerfMonth(m); setPerfYear(y); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', display: 'flex' }}><ChevronLeft size={14} /></button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink)', minWidth: 80, textAlign: 'center' }}>{MONTH_NAMES[perfMonth - 1]} {perfYear}</span>
              <button onClick={() => { const [m, y] = nextMonth(perfMonth, perfYear); setPerfMonth(m); setPerfYear(y); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', display: 'flex' }}><ChevronRight size={14} /></button>
            </div>
            {isSuperAdmin && (
              <OsBtn variant="leaf" size="sm" onClick={() => { setPerfDefaultUser(''); setEditPerfRecord(null); setShowPerfModal(true); }}>
                <Plus size={12} /> Record Performance
              </OsBtn>
            )}
          </div>

          {loadingPerf && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-leaf)' }} /></div>
          )}
          {!loadingPerf && (
            <>
              {/* Top/bottom */}
              {perfData.length >= 2 && (() => {
                const sorted = [...perfData].sort((a, b) => b.qualityScore - a.qualityScore);
                const top = sorted[0]; const bot = sorted[sorted.length - 1];
                const topMember = staff.find(s => s.id === top.userId);
                const botMember = staff.find(s => s.id === bot.userId);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {topMember && (
                      <OsCard accent="leaf">
                        <div style={{ ...monoFaint, color: 'var(--color-leaf)', marginBottom: 8 }}>★ TOP PERFORMER — {MONTH_NAMES[perfMonth - 1]}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={topMember.name} size={44} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{topMember.name}</div>
                            <div style={{ ...monoFaint, fontSize: 10 }}>quality {top.qualityScore} · {top.survivalPct}% survival · {top.sitesCount} sites</div>
                          </div>
                        </div>
                      </OsCard>
                    )}
                    {botMember && bot.userId !== top.userId && (
                      <OsCard accent="terra">
                        <div style={{ ...monoFaint, color: 'var(--color-terra)', marginBottom: 8 }}>⚠ NEEDS COACHING — {MONTH_NAMES[perfMonth - 1]}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={botMember.name} size={44} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{botMember.name}</div>
                            <div style={{ ...monoFaint, fontSize: 10 }}>quality {bot.qualityScore} · {bot.survivalPct}% survival · {bot.sitesCount} sites</div>
                          </div>
                        </div>
                      </OsCard>
                    )}
                  </div>
                );
              })()}

              {/* Distribution chart */}
              {perfData.length > 0 && (
                <OsCard>
                  <div style={{ ...monoFaint, marginBottom: 4 }}>QUALITY DISTRIBUTION</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', marginBottom: 14 }}>{MONTH_NAMES[perfMonth - 1]} {perfYear}</div>
                  <BarChart data={perfData.map(r => {
                    const m = staff.find(s => s.id === r.userId);
                    return { label: m?.name.split(' ')[0] ?? r.userId, value: r.qualityScore };
                  })} height={160} />
                </OsCard>
              )}

              {/* Per-staff cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {staff.map((s, i) => {
                  const perf = perfData.find(r => r.userId === s.id);
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <OsCard style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={s.name} size={40} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                              <Pill variant={ROLE_META[s.role]?.pill ?? 'neutral'}>{ROLE_META[s.role]?.label ?? s.role}</Pill>
                              {perf && <Pill variant={qualityScoreVariant(perf.qualityScore)}>Q: {perf.qualityScore}</Pill>}
                            </div>
                            {perf ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                  { label: 'Quality',    value: perf.qualityScore, max: 100, color: perf.qualityScore >= 80 ? 'var(--color-leaf)' : 'var(--color-gold)' },
                                  { label: 'Survival %', value: perf.survivalPct,  max: 100, color: 'var(--color-sky)'  },
                                  { label: 'On-Time %',  value: perf.onTimePct,    max: 100, color: perf.onTimePct >= 90 ? 'var(--color-leaf)' : 'var(--color-gold)' },
                                  { label: 'Sites',      value: perf.sitesCount,   max: Math.max(10, ...perfData.map(r => r.sitesCount)), color: 'var(--color-ink)' },
                                ].map(m => (
                                  <div key={m.label}>
                                    <div style={{ ...monoFaint, fontSize: 9, marginBottom: 4 }}>{m.label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: m.color, minWidth: 28 }}>{m.value}</span>
                                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--color-line)', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(m.value / m.max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08 }} style={{ height: '100%', background: m.color, borderRadius: 3 }} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--color-ink-faint)', fontSize: 12 }}>No performance data for {MONTH_NAMES[perfMonth - 1]} {perfYear}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isSuperAdmin && (
                              <OsBtn size="sm" variant="ghost" onClick={() => { setPerfDefaultUser(s.id); setEditPerfRecord(perf ?? null); setShowPerfModal(true); }}>
                                <Pencil size={12} /> {perf ? 'Edit' : 'Add'}
                              </OsBtn>
                            )}
                            <OsBtn size="sm" variant="ghost" onClick={() => { setSelectedId(s.id); setTab('profile'); }}>
                              <ChevronRight size={13} />
                            </OsBtn>
                          </div>
                        </div>
                      </OsCard>
                    </motion.div>
                  );
                })}
              </div>

              {staff.length > 0 && perfData.length === 0 && !loadingPerf && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-ink-faint)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>No performance records for {MONTH_NAMES[perfMonth - 1]} {perfYear}</div>
                  {isSuperAdmin && <div style={{ fontSize: 12, marginTop: 6 }}>Click &quot;Record Performance&quot; to add data.</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PROFILE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'profile' && current && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Left card */}
          <OsCard>
            <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
              <Avatar name={current.name} size={80} />
              <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic' }}>{current.name}</div>
              <div style={{ ...monoFaint, marginTop: 3 }}>{ROLE_META[current.role]?.label ?? current.role}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Pill variant={ROLE_META[current.role]?.pill ?? 'neutral'}>{ROLE_META[current.role]?.label ?? current.role}</Pill>
                {current.id === currentUser?.id && <Pill variant="leaf">You</Pill>}
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '14px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {([
                ['EMAIL',       current.email],
                ['JOINED',      current.joiningDate ? fmtDate(current.joiningDate) : fmtDate(current.createdAt)],
                ...(current.designation  ? [['TITLE',      current.designation]]  as [string,string][] : []),
                ...(current.phone        ? [['PHONE',      current.phone]]        as [string,string][] : []),
                ...(current.reportingTo  ? [['REPORTS TO', current.reportingTo]]  as [string,string][] : []),
                ...(current.responsibleFor ? [['RESP FOR',  current.responsibleFor]] as [string,string][] : []),
                ...(current.salary != null ? [['SALARY',   `₹ ${current.salary.toLocaleString('en-IN')} / mo`]] as [string,string][] : []),
                ...(current.vehicle      ? [['VEHICLE',    current.vehicle]]      as [string,string][] : []),
                ...(current.experience   ? [['EXP',        current.experience]]   as [string,string][] : []),
                ...(current.languages    ? [['LANGUAGES',  current.languages]]    as [string,string][] : []),
                ...(current.gmailEmail   ? [['GMAIL',      current.gmailEmail]]   as [string,string][] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ ...monoFaint, flex: '0 0 60px', paddingTop: 1 }}>{k}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', wordBreak: 'break-all', flex: 1, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Attendance summary for this month */}
            {currentSummary && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '14px 0' }} />
                <div style={{ ...monoFaint, marginBottom: 8 }}>ATTENDANCE · {MONTH_NAMES[attMonth - 1]}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { l: 'Present',  v: currentSummary.present,  c: 'var(--color-leaf)'       },
                    { l: 'Absent',   v: currentSummary.absent,   c: 'var(--color-terra)'      },
                    { l: 'Leave',    v: currentSummary.leave,    c: 'var(--color-sky)'        },
                    { l: 'Half-Day', v: currentSummary.halfDay,  c: 'var(--color-gold)'       },
                    { l: 'Hours',    v: `${currentSummary.totalHours}h`, c: 'var(--color-ink)' },
                    { l: 'GPS OK',   v: currentSummary.gpsVerified, c: 'var(--color-leaf)'    },
                  ].map(r => (
                    <div key={r.l} style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ ...monoFaint, fontSize: 9 }}>{r.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: r.c, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Performance this month */}
            {currentPerf && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '14px 0' }} />
                <div style={{ ...monoFaint, marginBottom: 8 }}>PERFORMANCE · {MONTH_NAMES[perfMonth - 1]}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {[
                    { l: 'Quality',   v: currentPerf.qualityScore, c: currentPerf.qualityScore >= 80 ? 'var(--color-leaf)' : 'var(--color-gold)' },
                    { l: 'Survival',  v: `${currentPerf.survivalPct}%`, c: 'var(--color-sky)'  },
                    { l: 'Sites',     v: currentPerf.sitesCount,   c: 'var(--color-ink)'       },
                    { l: 'On-Time',   v: `${currentPerf.onTimePct}%`, c: currentPerf.onTimePct >= 90 ? 'var(--color-leaf)' : 'var(--color-gold)' },
                  ].map(r => (
                    <div key={r.l} style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ ...monoFaint, fontSize: 9 }}>{r.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: r.c, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isSuperAdmin && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '14px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <OsBtn size="sm" onClick={() => { setEditStaff(current); setShowStaffForm(true); }}><Pencil size={12} /> Edit Profile</OsBtn>
                  <OsBtn size="sm" variant="leaf" onClick={() => { setAttDefaultUser(current.id); setAttDefaultDate(new Date().toISOString().split('T')[0]); setEditAttRecord(null); setShowAttModal(true); }}>
                    <Plus size={12} /> Mark Attendance
                  </OsBtn>
                  <OsBtn size="sm" onClick={() => { setPerfDefaultUser(current.id); setEditPerfRecord(currentPerf ?? null); setShowPerfModal(true); }}>
                    <Plus size={12} /> {currentPerf ? 'Edit Performance' : 'Add Performance'}
                  </OsBtn>
                  {current.id !== currentUser?.id && (
                    <OsBtn size="sm" variant="terra" onClick={() => handleStaffDelete(current)}><Trash2 size={12} /> Remove</OsBtn>
                  )}
                </div>
              </>
            )}

            {/* Switcher */}
            {staff.length > 1 && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '14px 0' }} />
                <div style={{ ...monoFaint, marginBottom: 8 }}>SWITCH PROFILE</div>
                {staff.map(s => (
                  <button key={s.id} onClick={() => setSelectedId(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, border: 'none', background: s.id === selectedId ? 'var(--color-surface-2)' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 2 }}>
                    <Avatar name={s.name} size={20} />
                    <span style={{ fontSize: 12, color: 'var(--color-ink)', fontFamily: 'var(--font-ui)' }}>{s.name}</span>
                  </button>
                ))}
              </>
            )}
          </OsCard>

          {/* Right — no data placeholder or real data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!currentPerf && !currentSummary && (
              <OsCard>
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-ink-faint)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, marginBottom: 8 }}>No performance or attendance data yet</div>
                  <div style={{ fontSize: 12 }}>
                    {isSuperAdmin ? 'Use the buttons on the left to add attendance and performance records.' : 'Check back after your manager records data.'}
                  </div>
                </div>
              </OsCard>
            )}
            {currentPerf && (
              <OsCard>
                <div style={{ ...monoFaint, marginBottom: 2 }}>PERFORMANCE · {MONTH_NAMES[perfMonth - 1]} {perfYear}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', marginBottom: 14 }}>Performance Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  <KPI label="Quality"    value={currentPerf.qualityScore} variant={currentPerf.qualityScore >= 80 ? 'leaf' : 'gold'} />
                  <KPI label="Survival %" value={`${currentPerf.survivalPct}%`} variant="leaf" />
                  <KPI label="On-Time %"  value={`${currentPerf.onTimePct}%`}   variant="leaf" />
                  <KPI label="Sites"      value={currentPerf.sitesCount}         />
                </div>
                {currentPerf.notes && <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', padding: '10px 0', borderTop: '1px solid var(--color-line)' }}>{currentPerf.notes}</div>}
              </OsCard>
            )}
            {currentSummary && (
              <OsCard>
                <div style={{ ...monoFaint, marginBottom: 2 }}>ATTENDANCE · {MONTH_NAMES[attMonth - 1]} {attYear}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', marginBottom: 14 }}>Attendance Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  <KPI label="Present"   value={currentSummary.present}  variant="leaf"  />
                  <KPI label="Absent"    value={currentSummary.absent}   variant="terra" />
                  <KPI label="Half-day"  value={currentSummary.halfDay}  variant="gold"  />
                  <KPI label="Total hrs" value={`${currentSummary.totalHours}h`} />
                </div>
                {/* Mini bar chart for this user's daily hours */}
                {(() => {
                  const recs = attendance.filter(r => r.userId === current.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  if (recs.length < 2) return null;
                  return (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '0 0 12px' }} />
                      <div style={{ ...monoFaint, marginBottom: 8 }}>DAILY HOURS</div>
                      <BarChart data={recs.map(r => ({ label: new Date(r.date).getDate().toString(), value: r.hoursWorked ?? 0 }))} height={100} />
                    </>
                  );
                })()}
              </OsCard>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ORG CHART TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'org-chart' && (
        <OrgChartView
          staff={staff}
          onSelect={(id) => { setSelectedId(id); setTab('profile'); }}
          perfData={perfData}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACCESS CONTROL TAB  (super-admin only)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'access-control' && isSuperAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--color-surface-2)', borderRadius: 12, border: '1px solid var(--color-line)' }}>
              <Shield size={22} color="var(--color-ink-soft)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', color: 'var(--color-ink)' }}>Access Control</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink-faint)', letterSpacing: '0.5px' }}>Manage role permissions · {staff.filter(s => !isPlaceholderEmail(s.email)).length} users with access</div>
            </div>
          </div>

          {/* Success banner */}
          {acSuccessMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-leaf-tint)', border: '1px solid var(--color-leaf)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: 'var(--color-leaf)' }}>
              <CheckCircle size={15} /> {acSuccessMsg}
            </div>
          )}

          {/* Role Permissions accordion */}
          <OsCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Lock size={16} color="var(--color-ink-faint)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Role Permissions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {Object.entries(ROLE_PERMISSIONS).map(([roleKey, info], idx) => {
                const isOpen = expandedAcRole === roleKey;
                const memberCount = staff.filter(s => s.role === roleKey && !isPlaceholderEmail(s.email)).length;
                return (
                  <div key={roleKey} style={{ borderTop: idx > 0 ? '1px solid var(--color-line)' : 'none' }}>
                    <button
                      onClick={() => setExpandedAcRole(isOpen ? null : roleKey)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(roleKey)}`}>
                          {getRoleLabel(roleKey)}
                        </span>
                        <span style={{ ...monoFaint, fontSize: 11 }}>{info.permissions.length} permissions</span>
                        {memberCount > 0 && (
                          <span style={{ ...monoFaint, fontSize: 11, background: 'var(--color-surface-2)', border: '1px solid var(--color-line)', borderRadius: 6, padding: '1px 6px' }}>
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={15} color="var(--color-ink-faint)" /> : <ChevronDown size={15} color="var(--color-ink-faint)" />}
                    </button>
                    {isOpen && (
                      <div style={{ paddingBottom: 14 }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {info.permissions.map((perm) => (
                            <li key={perm} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--color-ink-soft)' }}>
                              <CheckCircle size={14} color="var(--color-leaf)" style={{ flexShrink: 0, marginTop: 1 }} />
                              {perm}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </OsCard>

          {/* Admin Delete Policy */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(176,136,56,0.06)', border: '1px solid rgba(176,136,56,0.3)', borderRadius: 14, padding: '14px 18px' }}>
            <Clock size={18} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--color-gold)', marginBottom: 4 }}>Admin Delete Policy</div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>
                Admins can delete records freely within <strong>{DELETE_WINDOW_HOURS} hours</strong> of creation.
                After {DELETE_WINDOW_HOURS} hours, a delete request is sent to Super Admin for approval.
                Super Admins can delete any record at any time.
              </div>
            </div>
          </div>

          {/* Users / Role Management table */}
          {renderAccessUsersCard()}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}
      {isSuperAdmin && (
        <>
          <EmployeeFormModal
            open={showStaffForm}
            onClose={() => { setShowStaffForm(false); setEditStaff(null); }}
            onSaved={handleStaffSaved}
            editing={editStaff}
            staff={staff}
          />
          <AddUserModal
            open={showAddUser}
            onClose={() => setShowAddUser(false)}
            onSaved={handleStaffSaved}
            staff={staff}
          />

          {/* ── Edit User Modal (Access Control) ── */}
          {acEditUser && (
            <OsModal
              open={!!acEditUser}
              onClose={() => setAcEditUser(null)}
              title="Edit User"
              subtitle="Access Control · Update credentials & role"
              width={440}
              footer={<>
                <OsBtn onClick={() => setAcEditUser(null)}>Cancel</OsBtn>
                <OsBtn variant="leaf" onClick={handleAcEditSave} disabled={acEditSaving}>
                  {acEditSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Save Changes
                </OsBtn>
              </>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {acEditError && (
                  <div style={{ background: 'var(--color-terra-tint)', border: '1px solid var(--color-terra-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--color-terra)', display: 'flex', gap: 6 }}>
                    <X size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {acEditError}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '10px 14px' }}>
                  <Avatar name={acEditUser.name} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>{acEditUser.name}</div>
                    {acEditUser.employeeId && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-leaf)' }}>{acEditUser.employeeId}</div>}
                  </div>
                </div>
                <Field label="Full Name">
                  <input value={acEditForm.name} onChange={e => setAcEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Full name" />
                </Field>
                <Field label="Login Email">
                  <input type="email" value={acEditForm.email} onChange={e => setAcEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="user@pravaa.in" />
                </Field>
                <Field label="Role">
                  <select value={acEditForm.role} onChange={e => setAcEditForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} disabled={acEditUser.id === currentUser?.id}>
                    {Object.keys(ROLE_META).map(r => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
                  </select>
                  {acEditUser.id === currentUser?.id && <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 3 }}>You cannot change your own role.</div>}
                </Field>
                <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--color-ink-faint)', marginBottom: 10 }}>Change Password — leave blank to keep existing</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={acEditPwdVisible ? 'text' : 'password'}
                      value={acEditForm.password}
                      onChange={e => setAcEditForm(f => ({ ...f, password: e.target.value }))}
                      style={{ ...inputStyle, paddingRight: 36 }}
                      placeholder="New password (min. 6 chars)"
                    />
                    <button type="button" onClick={() => setAcEditPwdVisible(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-faint)' }}>
                      {acEditPwdVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {acEditForm.password && (
                    <input
                      type="password"
                      value={acEditForm.confirmPassword}
                      onChange={e => setAcEditForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 8 }}
                      placeholder="Confirm new password"
                    />
                  )}
                </div>
              </div>
            </OsModal>
          )}
          <AttendanceModal
            open={showAttModal}
            onClose={() => { setShowAttModal(false); setEditAttRecord(null); }}
            onSaved={handleAttSaved}
            staff={staff}
            existing={editAttRecord}
            defaultUserId={attDefaultUser}
            defaultDate={attDefaultDate}
          />
          <PerfModal
            open={showPerfModal}
            onClose={() => { setShowPerfModal(false); setEditPerfRecord(null); }}
            onSaved={handlePerfSaved}
            staff={staff}
            existing={editPerfRecord}
            defaultUserId={perfDefaultUser}
            month={perfMonth}
            year={perfYear}
          />
        </>
      )}
    </div>
  );
}
