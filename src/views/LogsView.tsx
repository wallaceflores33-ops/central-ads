import React, { useEffect, useState } from "react";
import { IntegrationLog } from "../types/index.ts";
import { formatDate } from "../lib/utils.ts";
import { ScrollText, Search, Filter, CheckCircle2, AlertCircle, Code, Eye } from "lucide-react";

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIntegration, setFilterIntegration] = useState("all");
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  const loadLogs = () => {
    setLoading(true);
    fetch(`/api/logs?integration=${filterIntegration}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLogs();
  }, [filterIntegration]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-400" />
            Logs de Integração
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro técnico de webhooks recebidos, sincronizações da API do Meta Ads e auditoria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterIntegration}
            onChange={(e) => setFilterIntegration(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as integrações</option>
            <option value="cakto">Cakto Webhook</option>
            <option value="meta">Meta Ads API</option>
            <option value="ai">Inteligência Artificial</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Integração</th>
                <th className="py-2.5 px-3">Evento</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4">Mensagem</th>
                <th className="py-2.5 px-3 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>

                  <td className="py-2.5 px-3 font-semibold text-white">
                    {log.integration}
                  </td>

                  <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                    {log.event}
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === "success"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : log.status === "warning"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-slate-300 max-w-md truncate">
                    {log.message}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {log.payload ? (
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Inspecionar JSON original"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                Payload JSON Técnico
              </h3>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-xs font-mono overflow-auto max-h-96">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
