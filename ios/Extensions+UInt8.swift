import Foundation

extension UInt8 {
  /// Converts UInt8 to data object.
  public var data: Data {
    var int = self
    return Data(bytes: &int, count: MemoryLayout<UInt8>.size)
  }
}
