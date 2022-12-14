import Foundation

extension UInt16 {
  /// Converts UInt16 to data object.
  public var data: Data {
    var int = self
    return Data(bytes: &int, count: MemoryLayout<UInt16>.size)
  }
}
