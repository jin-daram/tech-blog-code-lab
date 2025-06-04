import { context } from "../context";
import { ENTITY_MANAGER } from "../context/constants";

export function Transactional(): MethodDecorator {
  return function (_target, _propertyKey, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dataSource = context.getDataSource();
      return await dataSource.manager.transaction(async (transactionManager) => {
        return await context.run(new Map([[ENTITY_MANAGER, transactionManager]]), async () => {
          return await original.apply(this, args);
        });
      });
    };
  };
}
