"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInvoice,
  defaultBusiness,
  parseWorkspace,
  type SavedInvoice,
  type Workspace,
} from "../lib/invoice-model";
import type { Invoice } from "../lib/invoice-types";

const STORAGE_KEY = "weboin-workspace-v1";
export function useInvoiceWorkspace() {
  const [business, setBusiness] = useState(defaultBusiness);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<SavedInvoice[]>([]);
  const [storageStatus, setStorageStatus] = useState("Loading your workspace…");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [recoveryData, setRecoveryData] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastStored = useRef<string | null>(null);
  useEffect(() => {
    // Browser-only initialization. Keep malformed source data intact for recovery.
    const initialize = () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
        lastStored.current = raw;
        if (raw) {
          const data = parseWorkspace(raw);
          setBusiness(data.business);
          setInvoice(data.invoice);
          setHistory(data.history);
        } else setInvoice(createInvoice());
      } catch {
        setRecoveryData(raw);
        setInvoice(createInvoice());
        setStorageBlocked(true);
        setStorageStatus(
          "Saved data could not be loaded. Automatic saving is paused to protect it. Export a backup before restoring data.",
        );
      }
      setReady(true);
    };
    const timer = setTimeout(initialize, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready || !invoice || storageBlocked) return;
    const persist = () => {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== lastStored.current) {
          setStorageBlocked(true);
          setStorageStatus(
            "This workspace changed in another tab. Export a backup, then reload. Saving is paused to prevent conflicts.",
          );
          return;
        }
        const data: Workspace = { version: 1, business, invoice, history };
        const raw = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, raw);
        lastStored.current = raw;
        setStorageStatus("All changes saved on this device");
      } catch {
        setStorageStatus(
          "Browser storage is unavailable or full. Export a backup to keep your changes.",
        );
      }
    };
    const timer = setTimeout(persist, 300);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [business, invoice, history, ready, storageBlocked]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setStorageBlocked(true);
        setStorageStatus(
          "This workspace changed in another tab. Export a backup, then reload to use the latest saved data. Saving is paused to prevent conflicts.",
        );
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function exportBackup() {
    // Export the original corrupt data for recovery, or this tab's draft on conflict.
    const raw =
      recoveryData ??
      JSON.stringify({ version: 1, business, invoice, history }, null, 2);
    if (!raw) throw new Error("No data is available to export.");
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Weboin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBackup(file: File) {
    if (file.size > 20 * 1024 * 1024)
      throw new Error("Backup must be smaller than 20 MB.");
    const data = parseWorkspace(await file.text());
    if (
      !window.confirm(
        "Replace this browser’s business details, draft and invoice library with this backup? Export the current data first if you need to keep it.",
      )
    )
      return;
    // Verify storage is writable before replacing the current in-memory workspace.
    const raw = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, raw);
    lastStored.current = raw;
    setBusiness(data.business);
    setInvoice(data.invoice);
    setHistory(data.history);
    setStorageBlocked(false);
    setRecoveryData(null);
    setStorageStatus("Backup restored successfully.");
  }
  return {
    business,
    setBusiness,
    invoice,
    setInvoice,
    history,
    setHistory,
    storageStatus,
    exportBackup,
    importBackup,
  };
}
