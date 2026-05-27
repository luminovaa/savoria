import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BLEPrinter } from "react-native-thermal-receipt-printer";

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
      await BLEPrinter.printBill(receiptText, {
        cut: true,
        beep: true,
        encoding: "GBK",
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

export function buildCheckoutReceiptText({
  shopData,
  customer,
  invoiceNumber,
  paymentType,
  total,
  paid,
  changes,
  items,
}: CheckoutReceiptInput) {
  const shopName = shopData.name.toUpperCase();
  const addressLines = splitLongText(shopData.address, 32);
  const phoneText = `Telp: ${shopData.phone}`;

  let receiptText = `
  <C>=============================</C>
  <C>** ${shopName.slice(0, 32)} **</C>`;

  addressLines.forEach((line) => {
    receiptText += `
  <C>${line}</C>`;
  });

  receiptText += `
  <C>${phoneText.slice(0, 32)}</C>
  <C>=============================</C>
  <L>PELANGGAN: ${(customer.trim() || "-").slice(0, 15)}</L>
  <L>INV: ${invoiceNumber.slice(0, 15)}</L>
  <L>TGL: ${formatDatetoIndonesia(
    new Date().toISOString()
  )} - ${formatDatetoIndonesia2(new Date().toISOString())} </L>
  <L>TIPE: ${paymentType.toUpperCase().slice(0, 10)}</L>
  <C>-----------------------------</C>`;

  items.forEach((item) => {
    const itemName = capitalizeText(item.name_menu) || "Item";
    const quantityText = `${item.quantity}x`;
    const subtotalText = formatCurrency2(item.subtotal);
    const itemNameLines = splitTextToLines(itemName, 18);
    const formattedLine = formatReceiptLine(
      `${quantityText} ${itemNameLines[0] || ""}`,
      subtotalText,
      32
    );
    receiptText += `\n${formattedLine}`;

    if (itemNameLines.length > 1) {
      receiptText += `\n<L>  ${itemNameLines[1]}</L>`;
    }
  });
  receiptText += `
<C>-----------------------------</C>
<L>TOTAL:<R>${formatCurrency2(total)}</R></L>`;
  if (paid !== null) {
    receiptText += `
<L>DIBAYAR:<R>${formatCurrency2(paid)}</R></L>`;
    if (changes! > 0) {
      receiptText += `
<C>-----------------------------</C>
<L>KEMBALI:<R>${formatCurrency2(changes || 0)}</R></L>`;
    }
  }

  receiptText += `
<C>=============================</C>
<C>*** TERIMA KASIH ***</C>
<C>Barang yang dibeli</C>
<C>tidak dapat ditukar</C>`;
  if (shopData.wifi_name) {
    receiptText += `
  <C>-----------------------------</C>
  <C>Wifi: ${shopData.wifi_name.slice(0, 32)}</C>`;

    if (shopData.wifi_password) {
      receiptText += `
    <C>Password: ${shopData.wifi_password.slice(0, 32)}</C>`;
    }
  }

  return receiptText;
}

export function buildDetailReceiptText({ shopData, order, items }: DetailReceiptInput) {
  const shopName = shopData.name.toUpperCase();
  const addressLines = splitLongText(shopData.address, 32);
  const phoneText = `Telp: ${shopData.phone}`;

  let receiptText = `
  <C>=============================</C>
  <C>** ${shopName.slice(0, 32)} **</C>`;

  addressLines.forEach((line) => {
    receiptText += `
  <C>${line}</C>`;
  });

  receiptText += `
  <C>${phoneText.slice(0, 32)}</C>
  <C>=============================</C>
  <L>PELANGGAN: ${(order.customer || "-").slice(0, 15)}</L>
  <L>INV: ${order.invoice_number.slice(0, 15)}</L>
  <L>TGL: ${formatDatetoIndonesia(order.created_at)} - ${formatDatetoIndonesia2(order.created_at)}</L>
  <L>KASIR: ${(order.user?.full_name || "-").slice(0, 10)}</L>
  <C>-----------------------------</C>`;

  items.forEach((item) => {
    const itemName = capitalizeText(item.menu?.name_menu) || "Item";
    const quantityText = `${item.quantity}x`;
    const subtotalText = formatCurrency2(item.subtotal);
    const itemNameLines = splitTextToLines(itemName, 18);
    const formattedLine = formatReceiptLine(
      `${quantityText} ${itemNameLines[0] || ""}`,
      subtotalText,
      32
    );
    receiptText += `\n${formattedLine}`;

    if (itemNameLines.length > 1) {
      receiptText += `\n<L>  ${itemNameLines[1]}</L>`;
    }
  });
  receiptText += `
<C>-----------------------------</C>
<L>TOTAL:<R>${formatCurrency2(order.total_amount)}</R></L>`;
  if (order.paid !== null) {
    receiptText += `
    <L>DIBAYAR:<R>${formatCurrency2(order.paid || 0)}</R></L>`;
    if (order.changes! > 0) {
      receiptText += `
<C>-----------------------------</C>
<L>KEMBALI:<R>${formatCurrency2(order.changes || 0)}</R></L>`;
    }
  }

  receiptText += `
<C>=============================</C>
<C>*** TERIMA KASIH ***</C>
<C>Barang yang dibeli</C>
<C>tidak dapat ditukar</C>`;

  if (shopData.wifi_name) {
    receiptText += `
  <C>-----------------------------</C>
  <C>WiFi Toko</C>
  <C>${shopData.wifi_name.slice(0, 32)}</C>`;

    if (shopData.wifi_password) {
      receiptText += `
    <C>Password: ${shopData.wifi_password.slice(0, 32)}</C>`;
    }
  }

  return receiptText;
}
