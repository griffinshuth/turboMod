import Foundation

enum Unit {
  case lbs
  case kg
  case none
  
  var multiplier: Double {
    switch self {
    case .lbs:
      return 1
    case .kg:
      return 2.20462262185
    case .none:
      return 0
    }
  }
}
