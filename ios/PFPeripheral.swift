import UIKit
import Foundation
import SwiftyBluetooth
import CoreBluetooth

typealias CompletionHandler = () -> Swift.Void
typealias ErrorHandler = (String) -> Swift.Void
typealias BiometricResultHandler = ([String : Any]) -> Swift.Void

private let dateFormatter = DateFormatter()

protocol PFPeripheralProtocol {
  var peripheral: Peripheral { get set }
  var isScanningForBiometrics: Bool { get set }
  var calendar: Calendar { get }

  func discoverServices(onComplete: @escaping CompletionHandler, onError: @escaping ErrorHandler)
  func discoverCharacteristics(onComplete: @escaping CompletionHandler,onBiometricResult: @escaping BiometricResultHandler, onError: @escaping ErrorHandler)

  func writeDateTime(characteristic: CBCharacteristic, onComplete: @escaping CompletionHandler, onError: @escaping ErrorHandler)
  func observeBiometricReading(characteristic: CBCharacteristic, onBiometricResult: @escaping BiometricResultHandler, onError: @escaping ErrorHandler)
}

extension PFPeripheralProtocol {

  var calendar: Calendar {
    return Calendar.current
  }

  func writeDateTime(characteristic: CBCharacteristic, onComplete: @escaping CompletionHandler, onError: @escaping ErrorHandler) {
    let date = Date()
    let data = NSMutableData()

    let deviceResult = PFDevices.DeviceResult(peripheral: self.peripheral)
    if (characteristic.uuid.isEqual(CBUUID(string: "233BF001-5A34-1B6D-975C-000D5690ABE4")) && deviceResult.deviceType == .weightScale) {
      data.append(Data([0x08,0x01,0x04]))
    }

    data.append(UInt16(self.calendar.component(.year, from: date)).data)
    data.append(UInt8(self.calendar.component(.month, from: date)).data)
    data.append(UInt8(self.calendar.component(.day, from: date)).data)
    data.append(UInt8(self.calendar.component(.hour, from: date)).data)
    data.append(UInt8(self.calendar.component(.minute, from: date)).data)
    data.append(UInt8(self.calendar.component(.second, from: date)).data)
    peripheral.writeValue(ofCharac: characteristic, value: data as Data) { result in
      switch result {
      case .success:
        onComplete()
      case .failure(let error):
        onError(error.localizedDescription)
      }
    }
  }

  func observeBiometricReading(characteristic: CBCharacteristic, onBiometricResult: @escaping BiometricResultHandler, onError: @escaping ErrorHandler) {
    self.peripheral.setNotifyValue(toEnabled: true, ofCharac: characteristic, completion: { result in
      switch result {
      case .success(let isNotifying):
        debugPrint("isNotifying: \(isNotifying)")
        NotificationCenter.default.addObserver(forName: Peripheral.PeripheralCharacteristicValueUpdate, object: peripheral, queue: nil) { notification in
          if let characteristic = notification.userInfo?["characteristic"] as? CBCharacteristic {
            dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
            if let characteristicValue = characteristic.value {
              var info: [String : Any?] = [
                "original_source": self.peripheral.name ?? "",
                "accepted" : nil,
                "device_id": UIDevice.current.identifierForVendor?.uuidString ?? ""
              ]
              let flags = Flags(data: characteristicValue)
              var value = Double(characteristicValue.subdata(in: 1..<3).reversed().reduce(0) { result, byte in
                return result << 8 | UInt32(byte)
              })
              value = value * flags.getUnit().multiplier
              let deviceResult = PFDevices.DeviceResult(peripheral: self.peripheral)
              switch deviceResult.deviceType {
              case .weightScale:
                info["value"] = (value * 0.1).roundedNearest()
                break
              case .smartScale:
                info["value"] = (value * 0.01).roundedNearest()
                break
              case .none:
                info["value"] = 0
                break
              }

              if (characteristicValue.count > 3) {
                // date time is present
                let year = Int(characteristicValue.subdata(in: 3..<5).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let month = Int(characteristicValue.subdata(in: 5..<6).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let day = Int(characteristicValue.subdata(in: 6..<7).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let hour = Int(characteristicValue.subdata(in: 7..<8).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let minute = Int(characteristicValue.subdata(in: 8..<9).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let second = Int(characteristicValue.subdata(in: 9..<10).reversed().reduce(0) { result, byte in
                  return result << 8 | UInt32(byte)
                })
                let components = DateComponents(calendar: self.calendar, timeZone: TimeZone.current, year: year, month: month, day: day, hour: hour, minute: minute, second: second)
                if let date = self.calendar.date(from: components) {
                  info["collected_date"] = dateFormatter.string(from: date)
                  info["external_entry_id"] = "\(self.peripheral.name ?? "")_\(date.timeIntervalSince1970)"
                }
              } else {
                let date = Date()
                info["collected_date"] = dateFormatter.string(from: date)
                info["external_entry_id"] = "\(self.peripheral.name ?? "")_\(date.timeIntervalSince1970)"

                self.peripheral.discoverCharacteristics(withUUIDs: ["233BF001-5A34-1B6D-975C-000D5690ABE4"], ofServiceWithUUID: "233BF000-5A34-1B6D-975C-000D5690ABE4") { characteristicsResult in
                  switch characteristicsResult {
                  case .success(let characteristics):
                    for characteristic in characteristics {
                      if (characteristic.uuid.isEqual(CBUUID(string: "233BF001-5A34-1B6D-975C-000D5690ABE4"))) {
                        self.writeDateTime(characteristic: characteristic) {
                          debugPrint("here")
                        } onError: { errorMessage in
                          debugPrint("error: \(errorMessage)")
                        }

                      }
                    }
                  case .failure(let error):
                    onError(error.localizedDescription)
                  }
                }
              }
              onBiometricResult(info)
            }
          }
        }
      case .failure(let error):
        onError(error.localizedDescription)
      }
    })
  }
}

struct SmartScale: PFPeripheralProtocol {
  var peripheral: Peripheral
  var isScanningForBiometrics: Bool

  func discoverServices(onComplete: @escaping CompletionHandler, onError: @escaping ErrorHandler) {
    self.peripheral.discoverServices(withUUIDs: nil) { serviceResult in
      switch serviceResult {
      case .success(_):
        onComplete()
      case .failure(let error):
        onError(error.localizedDescription)
      }
    }
  }

  func discoverCharacteristics(onComplete: @escaping CompletionHandler, onBiometricResult: @escaping BiometricResultHandler, onError: @escaping ErrorHandler) {
    peripheral.discoverCharacteristics(withUUIDs: ["00002A2B-0000-1000-8000-00805f9b34fb"], ofServiceWithUUID: "00001805-0000-1000-8000-00805f9b34fb") { characteristicsResult in
      switch characteristicsResult {
      case .success(let characteristics):
        for characteristic in characteristics {
          if (characteristic.uuid.isEqual(CBUUID(string: "00002A2B-0000-1000-8000-00805f9b34fb"))) {
            self.writeDateTime(characteristic: characteristic, onComplete: onComplete, onError: onError)
          }
        }
        peripheral.discoverCharacteristics(withUUIDs: ["00002a9d-0000-1000-8000-00805f9b34fb"], ofServiceWithUUID: "0000181d-0000-1000-8000-00805f9b34fb") { characteristicsResult in
          switch characteristicsResult {
          case .success(let characteristics):
            for characteristic in characteristics {
              if (characteristic.uuid.isEqual(CBUUID(string: "00002a9d-0000-1000-8000-00805f9b34fb"))) {
                self.observeBiometricReading(characteristic: characteristic, onBiometricResult: onBiometricResult, onError: onError)
              }
            }
          case .failure(let error):
            onError(error.localizedDescription)
          }
        }
      case .failure(let error):
        onError(error.localizedDescription)
      }
    }
  }
}

struct WeightScale: PFPeripheralProtocol {
  var peripheral: Peripheral
  var isScanningForBiometrics: Bool

  func discoverServices(onComplete: @escaping CompletionHandler, onError: @escaping ErrorHandler) {
    self.peripheral.discoverServices(withUUIDs: ["23434100-1FE4-1EFF-80CB-00FF78297D8B"]) { serviceResult in
      switch serviceResult {
      case .success(_):
        onComplete()
      case .failure(let error):
        onError(error.localizedDescription)
      }
    }
  }

  func discoverCharacteristics(onComplete: @escaping CompletionHandler, onBiometricResult: @escaping BiometricResultHandler, onError: @escaping ErrorHandler) {
    peripheral.discoverCharacteristics(withUUIDs: ["00002a08-0000-1000-8000-00805f9b34fb", "23434101-1fe4-1eff-80cb-00ff78297d8b"], ofServiceWithUUID: "23434100-1FE4-1EFF-80CB-00FF78297D8B") { characteristicsResult in
      switch characteristicsResult {
      case .success(let characteristics):
        for characteristic in characteristics {
          if (characteristic.uuid.isEqual(CBUUID(string: "00002a08-0000-1000-8000-00805f9b34fb"))) {
            self.writeDateTime(characteristic: characteristic, onComplete: onComplete, onError: onError)
          }

          if (characteristic.uuid.isEqual(CBUUID(string: "23434101-1fe4-1eff-80cb-00ff78297d8b")) && self.isScanningForBiometrics) {
            self.observeBiometricReading(characteristic: characteristic, onBiometricResult: onBiometricResult, onError: onError)
          }
        }
      case .failure(let error):
        onError(error.localizedDescription)
      }
    }
  }
}
