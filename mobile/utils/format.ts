export const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const numericValue = value.replace(/[^0-9]/g, '');
    return numericValue ? parseFloat(numericValue) : 0;
};

export const formatDatetoIndonesia = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
export const formatDatetoIndonesia2 = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export const formatCurrency2 = (value: number) => {
    // Format number with thousands separator (comma) and no decimal
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `Rp${formatted}`; // Simple Rp prefix, no Unicode currency symbol
  };2

export const capitalizeText = (text: any): string => {
    if (typeof text !== "string") return String(text);
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };