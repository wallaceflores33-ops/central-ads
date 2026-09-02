export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return "0,0%";
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatDecimal(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return "0,00";
  return value.toFixed(decimals).replace(".", ",");
}

export function formatDate(isoStr: string): string {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export function getHealthBadge(score: number): {
  label: string;
  badgeClass: string;
  dotClass: string;
  textColor: string;
} {
  if (score >= 80) {
    return {
      label: "Excelente",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dotClass: "bg-emerald-400",
      textColor: "text-emerald-400",
    };
  }
  if (score >= 65) {
    return {
      label: "Saudável",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dotClass: "bg-emerald-400",
      textColor: "text-emerald-400",
    };
  }
  if (score >= 45) {
    return {
      label: "Atenção",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      dotClass: "bg-amber-400",
      textColor: "text-amber-400",
    };
  }
  return {
    label: "Crítico",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-400",
    textColor: "text-rose-400",
  };
}

export function getCategoryBadge(category: string): {
  label: string;
  badgeClass: string;
  iconBg: string;
} {
  switch (category) {
    case "action_required":
      return {
        label: "Ação Necessária",
        badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        iconBg: "bg-rose-500/20 text-rose-400",
      };
    case "warning":
      return {
        label: "Atenção",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        iconBg: "bg-amber-500/20 text-amber-400",
      };
    case "opportunity":
      return {
        label: "Oportunidade",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        iconBg: "bg-emerald-500/20 text-emerald-400",
      };
    case "info":
    default:
      return {
        label: "Informação",
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        iconBg: "bg-blue-500/20 text-blue-400",
      };
  }
}
