declare module 'react-native-bluetooth-escpos-printer' {
    export interface BluetoothDevice {
      name: string;
      address: string;
      paired?: boolean;
      connected?: boolean;
    }
  
    export interface BluetoothManager {
      isBluetoothEnabled(): Promise<boolean>;
      enableBluetooth(): Promise<boolean>;
      disableBluetooth(): Promise<boolean>;
      scanDevices(): Promise<{ found: BluetoothDevice[] }>;
      connect(address: string): Promise<any>;
      disconnect(address: string): Promise<any>;
      getConnectedDevices(): Promise<BluetoothDevice[]>;
    }
  
    export interface BluetoothEscposPrinter {
      printerInit(): Promise<any>;
      printText(text: string, options?: any): Promise<any>;
      printColumn(
        columnWidths: number[],
        columnAlignments: number[],
        columnTexts: string[],
        options?: any
      ): Promise<any>;
      printPic(base64: string, options?: any): Promise<any>;
      selfTest(): Promise<any>;
      cutPaper(): Promise<any>;
      printBarCode(
        code: string,
        type: number,
        width: number,
        height: number,
        position: number,
        font: number
      ): Promise<any>;
      printQRCode(
        content: string,
        size: number,
        correctionLevel: number
      ): Promise<any>;
      setWidth(width: number): Promise<any>;
  
      ALIGN: {
        LEFT: 0;
        CENTER: 1;
        RIGHT: 2;
      };
  
      ERROR_CORRECTION: {
        L: 1;
        M: 0;
        Q: 3;
        H: 2;
      };
  
      BARCODETYPE: {
        UPC_A: 65;
        UPC_E: 66;
        JAN13: 67;
        JAN8: 68;
        CODE39: 69;
        ITF: 70;
        CODABAR: 71;
        CODE93: 72;
        CODE128: 73;
      };
  
      ROTATION: {
        OFF: 0;
        ON: 1;
      };
    }
  
    export interface BluetoothTscPrinter {
      printLabel(options: any): Promise<any>;
  
      DIRECTION: {
        FORWARD: 0;
        BACKWARD: 1;
      };
  
      DENSITY: {
        DNESITY0: 0;
        DNESITY1: 1;
        DNESITY2: 2;
        DNESITY3: 3;
        DNESITY4: 4;
        DNESITY5: 5;
        DNESITY6: 6;
        DNESITY7: 7;
        DNESITY8: 8;
        DNESITY9: 9;
        DNESITY10: 10;
        DNESITY11: 11;
        DNESITY12: 12;
        DNESITY13: 13;
        DNESITY14: 14;
        DNESITY15: 15;
      };
  
      BARCODETYPE: {
        CODE128: '128';
        CODE128M: '128M';
        EAN128: 'EAN128';
        ITF25: '25';
        ITF25C: '25C';
        CODE39: '39';
        CODE39C: '39C';
        CODE39S: '39S';
        CODE93: '93';
        EAN13: 'EAN13';
        EAN13_2: 'EAN13+2';
        EAN13_5: 'EAN13+5';
        EAN8: 'EAN8';
        EAN8_2: 'EAN8+2';
        EAN8_5: 'EAN8+5';
        CODABAR: 'CODA';
        POST: 'POST';
        UPCA: 'EAN13';
        UPCA_2: 'EAN13+2';
        UPCA_5: 'EAN13+5';
        UPCE: 'EAN13';
        UPCE_2: 'EAN13+2';
        UPCE_5: 'EAN13+5';
        CPOST: 'CPOST';
        MSI: 'MSI';
        MSIC: 'MSIC';
        PLESSEY: 'PLESSEY';
        ITF14: 'ITF14';
        EAN14: 'EAN14';
      };
  
      FONTTYPE: {
        FONT_1: '1';
        FONT_2: '2';
        FONT_3: '3';
        FONT_4: '4';
        FONT_5: '5';
        FONT_6: '6';
        FONT_7: '7';
        FONT_8: '8';
        SIMPLIFIED_CHINESE: 'TSS24.BF2';
        TRADITIONAL_CHINESE: 'TST24.BF2';
        KOREAN: 'K';
      };
  
      EEC: {
        LEVEL_L: 'L';
        LEVEL_M: 'M';
        LEVEL_Q: 'Q';
        LEVEL_H: 'H';
      };
  
      ROTATION: {
        ROTATION_0: 0;
        ROTATION_90: 90;
        ROTATION_180: 180;
        ROTATION_270: 270;
      };
  
      FONTMUL: {
        MUL_1: 1;
        MUL_2: 2;
        MUL_3: 3;
        MUL_4: 4;
        MUL_5: 5;
        MUL_6: 6;
        MUL_7: 7;
        MUL_8: 8;
        MUL_9: 9;
        MUL_10: 10;
      };
  
      BITMAP_MODE: {
        OVERWRITE: 0;
        OR: 1;
        XOR: 2;
      };
  
      PRINT_SPEED: {
        SPEED1DIV5: 1;
        SPEED2: 2;
        SPEED3: 3;
        SPEED4: 4;
      };
  
      TEAR: {
        ON: 'ON';
        OFF: 'OFF';
      };
  
      READABLE: {
        DISABLE: 0;
        EANBLE: 1;
      };
    }
  
    export const BluetoothManager: BluetoothManager;
    export const BluetoothEscposPrinter: BluetoothEscposPrinter;
    export const BluetoothTscPrinter: BluetoothTscPrinter;
  }