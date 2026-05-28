import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BLEPrinter } from "react-native-thermal-receipt-printer";
import * as EPToolkit from "react-native-thermal-receipt-printer/dist/utils/EPToolkit";

import {
  capitalizeText,
  formatCurrency2,
  formatDatetoIndonesia,
  formatDatetoIndonesia2,
} from "@/utils/format";

export interface BluetoothDevice {
  inner_mac_address: string;
  device_name: string;
}

export type ReceiptShop = {
  name: string;
  address: string;
  phone: string;
  wifi_name?: string;
  wifi_password?: string;
};

export type CheckoutReceiptInput = {
  shopData: ReceiptShop;
  customer: string;
  cashier?: string;
  invoiceNumber: string;
  paymentType: string;
  total: number;
  paid: number | null;
  changes: number | null;
  items: Array<{
    name_menu: string;
    quantity: number;
    subtotal: number;
  }>;
};

export type DetailReceiptInput = {
  shopData: ReceiptShop;
  order: {
    customer?: string;
    invoice_number: string;
    created_at: string;
    total_amount: number;
    paid?: number | null;
    changes?: number | null;
    user?: {
      full_name?: string;
    };
  };
  items: Array<{
    menu?: {
      name_menu?: string;
    };
    quantity: number;
    subtotal: number;
  }>;
};

type UseReceiptPrinterOptions = {
  permissionRequiredTitle: string;
  permissionRequiredMessage: string;
  permissionSettingsLabel: string;
  noPrinterMessage: string;
  scanErrorPrefix: string;
  noDevicePatternMessage?: string;
};

type PrinterPickerModalProps = {
  animationType?: "none" | "slide" | "fade";
  visible: boolean;
  onClose: () => void;
  devices: BluetoothDevice[];
  selectedDevice: string | null;
  onSelectDevice: (value: string | null) => void;
  onPrint: () => void;
  printing: boolean;
  styles: any;
  description: string;
};

const RNBLEPrinter = NativeModules.RNBLEPrinter;

export function PrinterPickerModal({
  animationType = "fade",
  visible,
  onClose,
  devices,
  selectedDevice,
  onSelectDevice,
  onPrint,
  printing,
  styles,
  description,
}: PrinterPickerModalProps) {
  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Pilih Printer Bluetooth</Text>
          <Text style={styles.descriptionText}>{description}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDevice}
              onValueChange={(itemValue) => onSelectDevice(itemValue)}
              style={styles.picker}
              enabled={devices.length > 0}
            >
              <Picker.Item label="Pilih Printer..." value={null} />
              {devices.length > 0 ? (
                devices.map((device) => (
                  <Picker.Item
                    key={device.inner_mac_address}
                    label={device.device_name || device.inner_mac_address}
                    value={device.inner_mac_address}
                  />
                ))
              ) : (
                <Picker.Item label="Tidak ada printer terdeteksi" value={null} />
              )}
            </Picker>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Batal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!selectedDevice || printing) && { opacity: 0.5 },
              ]}
              onPress={onPrint}
              disabled={!selectedDevice || printing}
            >
              {printing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Cetak</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function useReceiptPrinter(options: UseReceiptPrinterOptions) {
  const [modalVisible, setModalVisible] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const requestAndroid31Permissions = async () => {
    if (Platform.OS !== "android") {
      console.log("Skipping permission request for non-Android platform");
      return true;
    }

    try {
      const permissions = [
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          rationale: {
            title: "Bluetooth Scan Permission",
            message:
              "Aplikasi memerlukan izin untuk memindai perangkat Bluetooth untuk menghubungkan ke printer.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          rationale: {
            title: "Bluetooth Connect Permission",
            message:
              "Aplikasi memerlukan izin untuk menghubungkan ke printer Bluetooth.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
      ];

      let allGranted = true;
      for (const { permission, rationale } of permissions) {
        const isGranted = await PermissionsAndroid.check(permission);
        console.log(`Permission ${permission} granted: ${isGranted}`);

        if (isGranted) continue;

        const result = await PermissionsAndroid.request(permission, rationale);
        console.log(`Permission ${permission} result: ${result}`);

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          const shouldShowRationale = await PermissionsAndroid.request(permission);
          if (!shouldShowRationale && result === PermissionsAndroid.RESULTS.DENIED) {
            Alert.alert(
              options.permissionRequiredTitle,
              `Izin ${rationale.title} diperlukan untuk mencetak struk. Silakan aktifkan di Pengaturan.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: options.permissionSettingsLabel,
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
          }
        }
      }

      return allGranted;
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert("Error", "Gagal meminta izin. Silakan coba lagi.");
      return false;
    }
  };

  const scanBluetoothDevices = async () => {
    console.log("Starting scanBluetoothDevices");
    try {
      const hasPermission = await requestAndroid31Permissions();
      if (!hasPermission) {
        Alert.alert(options.permissionRequiredTitle, options.permissionRequiredMessage, [
          { text: "Cancel", style: "cancel" },
          {
            text: options.permissionSettingsLabel,
            onPress: () => Linking.openSettings(),
          },
        ]);
        return;
      }

      setPrinting(true);
      await BLEPrinter.init();
      const foundDevices = await BLEPrinter.getDeviceList();
      console.log("Devices found:", foundDevices);

      if (foundDevices.length === 0) {
        Alert.alert("Info", options.noPrinterMessage);
      }

      setDevices(foundDevices);
      setModalVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (options.noDevicePatternMessage && /No Device Found/i.test(message)) {
        console.warn("No Bluetooth printer found");
        Alert.alert("Info", options.noDevicePatternMessage);
        return;
      }

      console.error("Scan error:", error);
      Alert.alert("Error", `${options.scanErrorPrefix}: ${message}`);
    } finally {
      setPrinting(false);
    }
  };

  const connectAndPrint = async (innerMacAddress: string, receiptText: string) => {
    setPrinting(true);
    try {
      await BLEPrinter.connectPrinter(innerMacAddress);
      const buffer = EPToolkit.exchange_text(`${receiptText}\n\n\n`, {
        encoding: "GBK",
        cut: true,
        beep: true,
      } as any);
      RNBLEPrinter.printRawData(buffer.toString("base64"), (error: string) => {
        if (error) console.warn(error);
      });
    } finally {
      setPrinting(false);
    }
  };

  return {
    modalVisible,
    setModalVisible,
    devices,
    selectedDevice,
    setSelectedDevice,
    printing,
    setPrinting,
    scanBluetoothDevices,
    connectAndPrint,
  };
}

function splitLongText(text: string, maxLength: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function splitTextToLines(text: string, maxLength: number, maxLines = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += " " + word;
    } else if (lines.length < maxLines - 1) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += " " + word;
      if (currentLine.length > maxLength) {
        currentLine = currentLine.substring(0, maxLength - 3) + "...";
      }
      break;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function formatReceiptLine(left: string, right: string, width = 32): string {
  const leftLen = left.length;
  const rightLen = right.length;
  const spacesNeeded = Math.max(1, width - leftLen - rightLen);
  const spaces = " ".repeat(spacesNeeded);

  return `<L>${left}${spaces}${right}</L>`;
}

const RECEIPT_WIDTH = 32;
const RECEIPT_LINE = "===============================";
const RECEIPT_DASH = "-------------------------------";
const LABEL_WIDTH = 10;

function cleanReceiptText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function receiptCurrency(value: number) {
  return formatCurrency2(value);
}

function buildKeyValueLines(label: string, value?: string | null) {
  const safeValue = cleanReceiptText(value) || "-";
  const valueWidth = RECEIPT_WIDTH - LABEL_WIDTH;
  const valueLines = splitTextToLines(safeValue, valueWidth, 3);
  const safeLabel = label.slice(0, LABEL_WIDTH - 1).padEnd(LABEL_WIDTH, " ");

  return valueLines
    .map((line, index) => {
      const prefix = index === 0 ? safeLabel : " ".repeat(LABEL_WIDTH);
      return `<L>${prefix}${line}</L>`;
    })
    .join("\n");
}

function buildReceiptHeader(shopData: ReceiptShop) {
  const shopName = cleanReceiptText(shopData.name).toUpperCase();
  const addressLines = splitLongText(cleanReceiptText(shopData.address), RECEIPT_WIDTH);
  const phoneText = cleanReceiptText(shopData.phone)
    ? `Telp: ${cleanReceiptText(shopData.phone)}`
    : "";

  let receiptText = `<C>${RECEIPT_LINE}</C>
<C>${shopName.slice(0, RECEIPT_WIDTH)}</C>`;

  addressLines.forEach((line) => {
    if (!line) return;
    receiptText += `\n<C>${line}</C>`;
  });

  if (phoneText) {
    receiptText += `\n<C>${phoneText.slice(0, RECEIPT_WIDTH)}</C>`;
  }

  receiptText += `\n<C>${RECEIPT_LINE}</C>`;
  return receiptText;
}

function buildReceiptInfo(input: {
  invoice: string;
  createdAt: string;
  customer?: string | null;
  cashier?: string | null;
}) {
  const lines = [
    buildKeyValueLines("Invoice", input.invoice),
    buildKeyValueLines(
      "Tanggal",
      `${formatDatetoIndonesia(input.createdAt)} ${formatDatetoIndonesia2(input.createdAt)}`
    ),
    buildKeyValueLines("Pelanggan", input.customer),
  ];

  if (cleanReceiptText(input.cashier)) {
    lines.push(buildKeyValueLines("Kasir", input.cashier));
  }

  return lines.join("\n");
}

function buildReceiptItems(
  items: Array<{ name: string; quantity: number; subtotal: number }>
) {
  return items
    .map((item) => {
      const amount = receiptCurrency(item.subtotal);
      const firstLineWidth = Math.max(8, RECEIPT_WIDTH - amount.length - 1);
      const itemName = capitalizeText(cleanReceiptText(item.name)) || "Item";
      const itemLines = splitTextToLines(`${item.quantity}x ${itemName}`, firstLineWidth, 3);
      let text = formatReceiptLine(itemLines[0] || "Item", amount, RECEIPT_WIDTH);

      itemLines.slice(1).forEach((line) => {
        text += `\n<L>   ${line.slice(0, RECEIPT_WIDTH - 3)}</L>`;
      });

      return text;
    })
    .join("\n");
}

function buildPaymentSummary(input: {
  total: number;
  paid?: number | null;
  changes?: number | null;
}) {
  let text = formatReceiptLine("TOTAL", receiptCurrency(input.total), RECEIPT_WIDTH);

  if (input.paid !== null && input.paid !== undefined) {
    text += `\n${formatReceiptLine("Dibayar", receiptCurrency(input.paid), RECEIPT_WIDTH)}`;
  }

  if ((input.changes || 0) > 0) {
    text += `\n${formatReceiptLine("Kembali", receiptCurrency(input.changes || 0), RECEIPT_WIDTH)}`;
  }

  return text;
}

function buildReceiptFooter(shopData: ReceiptShop) {
  let receiptText = `<C>TERIMA KASIH</C>
<C>Barang yang dibeli tidak</C>
<C>dapat ditukar</C>`;

  if (shopData.wifi_name) {
    receiptText += `\n\n<C>Wifi: ${cleanReceiptText(shopData.wifi_name).slice(0, 26)}</C>`;

    if (shopData.wifi_password) {
      receiptText += `\n<C>Password: ${cleanReceiptText(shopData.wifi_password).slice(0, 22)}</C>`;
    }
  }

  return receiptText;
}

export function buildCheckoutReceiptText({
  shopData,
  customer,
  cashier,
  invoiceNumber,
  total,
  paid,
  changes,
  items,
}: CheckoutReceiptInput) {
  const createdAt = new Date().toISOString();
  const receiptItems = items.map((item) => ({
    name: item.name_menu,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  return `${buildReceiptHeader(shopData)}
${buildReceiptInfo({
  invoice: invoiceNumber,
  createdAt,
  customer,
  cashier,
})}
<C>${RECEIPT_DASH}</C>
${buildReceiptItems(receiptItems)}
<C>${RECEIPT_DASH}</C>
${buildPaymentSummary({ total, paid, changes })}

${buildReceiptFooter(shopData)}`;
}

export function buildDetailReceiptText({ shopData, order, items }: DetailReceiptInput) {
  const receiptItems = items.map((item) => ({
    name: item.menu?.name_menu || "Item",
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  return `${buildReceiptHeader(shopData)}
${buildReceiptInfo({
  invoice: order.invoice_number,
  createdAt: order.created_at,
  customer: order.customer,
  cashier: order.user?.full_name,
})}
<C>${RECEIPT_DASH}</C>
${buildReceiptItems(receiptItems)}
<C>${RECEIPT_DASH}</C>
${buildPaymentSummary({
  total: order.total_amount,
  paid: order.paid,
  changes: order.changes,
})}

${buildReceiptFooter(shopData)}`;
}
