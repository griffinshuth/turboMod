import Foundation

extension Data {
  ///  Converts data to hex string.
    var hexString: String {
        return map { String(format: "%02hhx", $0) }.joined()
    }
}
