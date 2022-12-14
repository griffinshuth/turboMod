import Foundation

enum Constants {
  enum BLUETOOTH_CONNECTION_STATUS {
    static let SCANNING = "SCANNING"
    static let FOUND = "FOUND"
    static let CONNECTING = "CONNECTING"
    static let CONNECTED = "CONNECTED"
    static let READING = "READING"
  }
  
  enum EVENT_NAMES {
    static let Error = "NexusError"
    static let Result = "NexusResult"
    static let Status = "NexusStatus"
    static let Timeout = "NexusTimeout"
  }
  
  enum BLUETOOTH_CONNECTION_ERROR {
    static let CONNECTION_FAILED = "We could not connect to your device, try again."
    static let NOT_SUPPORTED = "Your device does not support Bluetooth."
  }
  
  enum WEIGHT_SCALE {}
  
  enum SMART_SCALE {}
}
