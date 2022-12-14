import Foundation

struct Flags {
  let data: Data
  
  func getUnit() -> Unit {
    let unit = data.subdata(in: 0..<1).reversed().reduce(0) { partialResult, byte in
      return partialResult << 8 | UInt32(byte)
    }
    if (unit == 0 || unit == 2) {
      return .kg
    } else {
      return .lbs
    }
  }
}
