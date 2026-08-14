export const onlyDigits = (v: string) => v.replace(/\D/g, "");
export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10)
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join(""),
    );
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}
export function maskCpf(v: string) {
  return onlyDigits(v)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
export function maskDocument(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) return maskCpf(d);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
export function maskMoney(v: string) {
  const d = onlyDigits(v);
  return (Number(d || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function moneyToCents(v: string) {
  return Number(onlyDigits(v) || 0);
}
