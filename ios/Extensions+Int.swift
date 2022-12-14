import Foundation

extension Int {
    /// Perform a bit pattern truncating conversion to UInt8
    public var toU8: UInt8{return UInt8(truncatingIfNeeded:self)}
    /// Perform a bit pattern truncating conversion to Int8
    public var to8: Int8{return Int8(truncatingIfNeeded:self)}
    /// Perform a bit pattern truncating conversion to UInt16
    public var toU16: UInt16{return UInt16(truncatingIfNeeded:self)}
    /// Perform a bit pattern truncating conversion to Int16
    public var to16: Int16{return Int16(truncatingIfNeeded:self)}
}
