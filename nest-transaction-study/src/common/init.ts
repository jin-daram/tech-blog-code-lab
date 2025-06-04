import { Repository } from "typeorm"
import { context } from "./context"

export function init() {
    Object.defineProperty(Repository.prototype, 'manager', {
        configurable: true,
        get() {
            return context.get('entityManager')
        },
        set() {

        }
    })
}