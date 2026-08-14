export const digits = (value: string) => String(value || "").replace(/\D/g, "");
export function validPhone(value: string) {
  const d = digits(value);
  return d.length === 10 || d.length === 11;
}
export function validCpf(value: string) {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(d[t])) return false;
  }
  return true;
}
export function validCnpj(value: string) {
  const d = digits(value);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base
        .split("")
        .reduce((n, x, i) => n + Number(x) * weights[i], 0),
      r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return (
    calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(d[12]) &&
    calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(d[13])
  );
}
export const validDocument = (value: string) => {
  const d = digits(value);
  return d.length === 11 ? validCpf(d) : d.length === 14 ? validCnpj(d) : false;
};
