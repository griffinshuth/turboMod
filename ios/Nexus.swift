import Foundation
import CoreBluetooth
import SwiftyBluetooth

private let SCAN_TIMEOUT: TimeInterval = 30
private let CONNECT_TIMEOUT: TimeInterval = 30

enum PFDevices {
  
  static func DeviceResult(peripheral: Peripheral) -> (isSupported: Bool, deviceType: BlEDevice) {
    guard let name = peripheral.name, !name.isEmpty else {
      return (false, .none)
    }
    
    if (name.contains("A&D_UC-352BLE_")) {
      return (true, .weightScale)
    }
    
    if (name.contains("LS102") || name.contains("51-102")) {
      return (true, .smartScale)
    }
    
    return (false, .none)
  }
}

enum BlEDevice {
  case smartScale
  case weightScale
  case none
}

@objc(Nexus)
public class Nexus: RCTEventEmitter {
  
  private var peripheral: Peripheral?
  private var biometrics: [[String : Any]] = []
  private var lastIncomingReading: UInt64 = 0
  private var isScanningForBiometrics = false
  private var restoredPeripherals: [Peripheral] = []
  
  public override func supportedEvents() -> [String]! {
    return [
      Constants.EVENT_NAMES.Result,
      Constants.EVENT_NAMES.Status,
      Constants.EVENT_NAMES.Error,
      Constants.EVENT_NAMES.Timeout
    ]
  }
  
  public override func constantsToExport() -> [AnyHashable : Any]! {
    return [:]
  }
  
  public override class func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc public class func setSharedCentralInstance() {
    SwiftyBluetooth.setSharedCentralInstanceWith(restoreIdentifier: "PACE_BLUETOOTH_RESTORATION_IDENTIFIER")
  }
  
  /// Called to store peripherals that are in settings and we would need to connect and not re-pair
  @objc public func configure() {
    NotificationCenter.default.addObserver(forName: Central.CentralManagerWillRestoreState, object: Central.sharedInstance, queue: nil) { notification in
      if let peripherals = notification.userInfo?["peripherals"] as? [Peripheral] {
        self.restoredPeripherals = peripherals
      }
    }
  }
  
  /// Called to  stop scanning for peripherals
  @objc public func stopScan() {
    self.stopScanning()
  }
  
  /// Called to scan peripherals for transmission
  @objc (scanAndTransmit:)
  public func scanAndTransmit(name: String) {
    self.isScanningForBiometrics = true
    let peripherals = SwiftyBluetooth.retrievePeripherals(withUUIDs: restoredPeripherals.map({ $0.identifier }))
    if (peripherals.isEmpty) {
      self.scan()
    } else {
      var shouldScan = false
      
      for peripheral in peripherals {
        if let peripheralName = peripheral.name {
          if (peripheralName.contains(name)) {
            shouldScan = false
            self.handleConnect(peripheral)
            break;
          } else {
            shouldScan = true
          }
        }
      }
      
      if (shouldScan) {
        self.scan()
      }
    }
  }
  
  /// Called to scan peripherals for pairing
  @objc(scanAndPair:)
  public func scanAndPair(name: String) {
    self.isScanningForBiometrics = false
    let peripherals = SwiftyBluetooth.retrievePeripherals(withUUIDs: restoredPeripherals.map({ $0.identifier }))
    if (peripherals.isEmpty) {
      self.scan()
    } else {
      var shouldScan = false
      
      for peripheral in peripherals {
        if let peripheralName = peripheral.name {
          if (peripheralName.contains(name)) {
            shouldScan = false
            self.handleConnect(peripheral)
            break;
          } else {
            shouldScan = true
          }
        }
      }
      
      if (shouldScan) {
        self.scan()
      }
    }
  }
  
  private func handleTimer() {
    DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 30.0) {
      if (self.isScanningForBiometrics && self.biometrics.isEmpty) {
        self.sendEvent(withName: Constants.EVENT_NAMES.Timeout, body: "")
      }
      
      if (!self.isScanningForBiometrics) {
        self.sendEvent(withName: Constants.EVENT_NAMES.Timeout, body: "")
      }
      
      self.isScanningForBiometrics = false
      self.biometrics = []
    }
  }
  
  private func handleConnect(_ peripheral: Peripheral) {
    self.handleTimer()
    self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.SCANNING)
    self.peripheral = peripheral
    peripheral.connect(withTimeout: CONNECT_TIMEOUT) { connectionResult in
      switch connectionResult {
      case .success:
        self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.FOUND)
        let deviceResult = PFDevices.DeviceResult(peripheral: peripheral)
        switch deviceResult.deviceType {
        case .weightScale:
          let scale = WeightScale(peripheral: peripheral, isScanningForBiometrics: self.isScanningForBiometrics)
          scale.discoverServices {
            self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.CONNECTING)
            scale.discoverCharacteristics {
              self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.CONNECTED)
            } onBiometricResult: { info in
              self.biometrics.append(info)
              self.sendBiometrics()
            } onError: { errorMessage in
              self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: errorMessage)
            }
          } onError: { errorMessage in
            self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: errorMessage)
          }
          break
        case .smartScale:
          let scale = SmartScale(peripheral: peripheral, isScanningForBiometrics: self.isScanningForBiometrics)
          scale.discoverServices {
            self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.CONNECTING)
            scale.discoverCharacteristics {
              self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.CONNECTED)
            } onBiometricResult: { info in
              self.biometrics.append(info)
              self.sendBiometrics()
            } onError: { errorMessage in
              self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: errorMessage)
            }
          } onError: { errorMessage in
            self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: errorMessage)
          }
          break
        case .none:
          break
        }
      case .failure(let error):
        self.peripheral = nil
        self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: error.localizedDescription)
      }
    }
  }
  
  private func scan() {
    self.handleTimer()
    SwiftyBluetooth.scanForPeripherals(withServiceUUIDs: [
      "0000181d-0000-1000-8000-00805f9b34fb",
      "23434100-1FE4-1EFF-80CB-00FF78297D8B"
    ], options: [
      CBCentralManagerScanOptionAllowDuplicatesKey: false,
      CBCentralManagerOptionRestoreIdentifierKey: "PACE_BLUETOOTH_RESTORATION_IDENTIFIER",
      CBCentralManagerRestoredStatePeripheralsKey: "PACE_BLUETOOTH_PERIPHERAL_IDENTIFIER"
    ], timeoutAfter: SCAN_TIMEOUT) { scanResult in
      switch scanResult {
      case .scanStarted:
        self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.SCANNING)
      case .scanResult(peripheral: let peripheral, advertisementData: _, RSSI: _):
        let deviceResult = PFDevices.DeviceResult(peripheral: peripheral)
        if (deviceResult.isSupported) {
          self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.FOUND)
          SwiftyBluetooth.stopScan()
        }
      case .scanStopped(peripherals: let peripherals, error: let error):
        if let error = error {
          self.sendEvent(withName: Constants.EVENT_NAMES.Error, body: error.localizedDescription)
        } else if let peripheral = peripherals.first {
          self.sendEvent(withName: Constants.EVENT_NAMES.Status, body: Constants.BLUETOOTH_CONNECTION_STATUS.CONNECTING)
          self.handleConnect(peripheral)
        }
      }
    }
  }
  
  private func sendBiometrics() {
    self.lastIncomingReading = DispatchTime.now().uptimeNanoseconds
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
      let now = DispatchTime.now().uptimeNanoseconds
      if (self.lastIncomingReading > 0 && self.lastIncomingReading < now - 900000000) {
        self.sendEvent(withName: Constants.EVENT_NAMES.Result, body: self.biometrics)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
          self.biometrics = []
          self.stopScanning()
        }
      }
    }
  }
  
  private func stopScanning() {
    SwiftyBluetooth.stopScan()
    self.peripheral?.disconnect(completion: { result in
      switch result {
      case .success(_):
        debugPrint("disconnected from \(self.peripheral?.name ?? "")")
      case .failure(let error):
        debugPrint(error.localizedDescription)
      }
      self.peripheral = nil
    })
  }
}
