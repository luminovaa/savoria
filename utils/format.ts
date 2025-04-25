export const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const numericValue = value.replace(/[^0-9]/g, '');
    return numericValue ? parseFloat(numericValue) : 0;
};


export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};


export const capitalizeText = (text: any): string => {
    if (typeof text !== "string") return String(text);
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };