# UserRepository에서 save() 하면 어떻게 Transaction이 구현될까
---
데이터베이스에 데이터를 저장하거나 수정할 때, Transaction은 반드시 사용해야 하는 것으로 여겨진다. 
예를 들어 Team과 User 테이블이 존재한다고 했을 때, 새로운 User를 추가하게 되면 속한 Team에 대해 데이터를 추가해줘야 한다. 

```ts title='User, Team 데이터 저장 예시'
const team: Team = this.teamRepository.find(newUser.teamId);
this.userRepository.save(newUser);
this.teamUserRepository.save(team, newUser)
```


하지만 어떠한 이유로 `this.userRepository.save(newUser)` 로직이 실패한다면 어떻게 될까? 우리는 `this.teamUserRepository.save(...)` 로직도 같이 실패하길 바란다. 등록되지 못한 유저가 Team에 속할 수 없기 때문이다. 


```ts title='Transaction이 두번 시작 됨'
async createUser(userCreateRequest: UserCreateRequest): Promise<void> {
		this.userRepository.save(userCreateRequest);

		this.userRepository.save(userCreateRequest);
}
```

![[Pasted image 20250530140534.png]]

이처럼 2 번의 `START TRANSACTION` 이 실행되는 것을 확인할 수 있다. 어떻게 여러 개의 DML을 하나의 Transaction으로 묶을 수 있을까?

### EntityManager.transaction()
---
```ts
async createUser(userCreateRequest: UserCreateRequest): Promise<void> {
		await this.em.transaction(async (manager) => {
				const user = manager.create(User, userCreateRequest);        
				const user2 = manager.create(User, userCreateRequest);
				await manager.save(user);
				await manager.save(user2);

				return user;
		})
}
```

![[Pasted image 20250530140904.png]]

`EntityManager` 를 주입받아서, `Transaction` 을 이용하면 하나의 `Transaction` 으로 묶어서 처리할 수 있다. 

### EntityManager
`EntityManager` 는 `TypeORM`에서 모든 엔티티에 대해 쿼리/삽입/삭제/수정 작업을 할 수 있는 인터페이스이다. `EntityManager` 를 이용하면 `UserRepository` 와 같이 `Repository` 구현체 없이 엔티티를 조작할 수 있다. 결국 `Repository<Entity>` 의 구현체도 EntityManager 를 통해 엔티티를 조작한다.

우리가 `... extends Repository<Entity>` 를 통해 만든 Repository 에서도 결국엔 EntityManager를 통해 엔티티를 관리한다.  

[TypeORM Github](https://github.com/typeorm) 를 통해 소스 코드를 찾아볼 수 있다.  

```ts title=Repository.ts'
/**
 * Saves one or many given entities.
 */
save<T extends DeepPartial<Entity>>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
): Promise<T | T[]> {
		return this.manager.save<Entity, T>(
				this.metadata.target as any,
				entityOrEntities as any,
				options,
		)
}
```

`src/repository/Repository.ts`  코드를 살펴보면 `save()` 가 `this.manager.save()` 함수를 통해 구현되었다는 것을 확인할 수 있다. 여기서 `this.manager`는 바로 `EntityManager` 이다. 그렇다면 `EntityManager`의 `save()` 함수는 어떻게 구현되어 있을까?


```ts title='EntityManager.ts'
save<Entity extends ObjectLiteral, T extends DeepPartial<Entity>>(
        targetOrEntity: (T | T[]) | EntityTarget<Entity>,
        maybeEntityOrOptions?: T | T[],
        maybeOptions?: SaveOptions,
    ): Promise<T | T[]> {
	...
	return new EntityPersistExecutor(
							this.connection,
							this.queryRunner,
							"save",
							target,
							entity,
							options,
					)
							.execute()
							.then(() => entity)
}
```

`...` 에 명시된 내용은 함수의 인자로 들어온 엔티티에 대해 검증하고 체크하는 로직이 있다. 해당 데이터를 영속화 시키는 행위는 `EntityPersistExecutor` 에서 일어난다. EntityPersistExecutor는 영속화 할 때 마다 생성되어, EntityManager의 `Connection`, `QueryRunner` 와 `...`에 해당하는 검증으로 만들어진 `target`, `entity`, `options` 데이터를 생성자의 인자를 통해 생성된다. 

그럼 다시 `EntityPersistExecutor` 를 살펴보자. 

```ts title='EntityPersistExecutor.ts'
...
let isTransactionStartedByUs = false
try {
		// open transaction if its not opened yet
		if (!queryRunner.isTransactionActive) {
				if (
						this.connection.driver.transactionSupport !== "none" &&
						(!this.options || this.options.transaction !== false)
				) {
						// start transaction until it was not explicitly disabled
						isTransactionStartedByUs = true
						await queryRunner.startTransaction()
				}
		}

		// execute all persistence operations for all entities we have
		// console.time("executing subject executors...");
		for (const executor of executorsWithExecutableOperations) {
				await executor.execute()
		}
		// console.timeEnd("executing subject executors...");

		// commit transaction if it was started by us
		// console.time("commit");
		if (isTransactionStartedByUs === true)
				await queryRunner.commitTransaction()
		// console.timeEnd("commit");
} catch (error) {
		// rollback transaction if it was started by us
		if (isTransactionStartedByUs) {
				try {
						await queryRunner.rollbackTransaction()
				} catch (rollbackError) {}
		}
		throw error
}
...
```

`execute()` 메서드의 많은 내용 중 `Transaction` 에 관여하는 내용만 발췌했다. 
- 가장 먼저 생성된 QueryRunner 를 통해 `Transaction`이 활성화 되어 있는지 확인한다. 


### 참조
---
https://orkhan.gitbook.io/typeorm/docs/query-runner





### asd
---
```ts title='user.repository.ts'
export class UserRepository {
	constructor(dataSource: DataSource) {
		super(User, dataSource.createEntityManager());
	}
}
```

처음 `CustomRepository` 를 만들 때, 위와 같은 방식으로 만들었다. 하지만 위 방법은 꽤 위험하다.

```ts title='user.service.ts'
@Injectable()
export class UserService {

    constructor(
        private readonly em: EntityManager,
        private readonly userRepository: UserRepository,
    ) {}

    async createUser(userCreateRequest: UserCreateRequest): Promise<void> {
        await this.em.transaction(async (manager) => {
            this.userRepository.save(userCreateRequest);
        })
    }

}
```

`Transaction` 을 사용하기 위해서 위와 같이 코드를 구성했다. 간단하게 `EntityManager` 를 주입받고, `EntityManager` 의 `transaction` 함수를 통해 Transaction 을 `시작`, `유저 데이터 삽입`, `종료` 가 이루어진다.

![[Pasted image 20250602111532.png]]

하지만 실제 쿼리를 확인해보면 `START TRANSACTION` 이 두번 호출된 것을 확인할 수 있다. 이게 어떻게 된 것일까? 

### EntityManager
우리가 만든 UserRepository는 `save()` 와 같은 함수를 사용할 때, 내부적으로 주어진 `EntityManager` 를 사용한다. 하지만 이는 UserService의 생성자에 주입된 `EntityManager` 가 아닌, `UserRepository` 의 생성자에서 `dataSource.createEntityManager()` 로 생성한 `EntityManager` 이다. 이 둘은 서로 다른 `EntityManger` 이기 때문에 서로의 `Transaction` 에 관여할 수 없다. 즉 `em.transaction(...)` 안에 `userRepository.save(...)` 를 선언하게 되면 서로 다른 `EntityManager`의 관리 하에 트랜잭션이 이루어지기 때문에 제대로 관리할 수 없다.

그럼 각각의 `EntityManager` 는 어디서 생성된 것일까?

UserRepository의 EntityManager는 우리가 생성자에서 `dataSource.createEntityManager()` 를 통해 생성한 EntityManager를 사용하여 Entity를 관리한다. 
그렇다면 UserService에서 DI를 통해 주입받은 EntityManager는 어디서 생성된 것일까? 이는 `@nestjs/typeorm` 저장소에서 코드를 확인할 수 있다.

먼저 우리는 `TypeOrmModule`을 통해 TypeORM에 DataSource 정보를 전달한다.

```ts title='app.module.ts'
@Module({
  imports: [  
    TypeOrmModule.forRoot(...),
    UserModule
  ],
  controllers: [...],
  providers: [...],
}) 
export class AppModule {}
```

이 `TypeOrmModule` 은 내부에 `TypeOrmCoreModule` 이라는 것을 통해 `forRoot()` 함수를 구현한다.

```ts title=typeorm.module.ts
...
static forRoot(options?: TypeOrmModuleOptions): DynamicModule {
	return {
		module: TypeOrmModule,
		imports: [TypeOrmCoreModule.forRoot(options)], // TypeOrmCoreModule의 forRoot()를 통해 구현
	};
}
...
```

```ts title='typeorm-core-module.ts'
...
static forRoot(options: TypeOrmModuleOptions = {}): DynamicModule {
	...
	
	const entityManagerProvider = this.createEntityManagerProvider(
		options as DataSourceOptions,
	);

	const providers = [
		entityManagerProvider,
		...,
	];
	...
	return {
		module: TypeOrmCoreModule,
		providers,
		exports,
	};
}
...
```

`typeorm-core-module.ts` 에서는 `createEntityManagerProvider()`를 통해 `provider`에 `EntityManager`를 생성하여 Providers에 등록한다.

```ts
private static createEntityManagerProvider(
	options: DataSourceOptions,
	): Provider {
	return {
		provide: getEntityManagerToken(options) as string,
		useFactory: (dataSource: DataSource) => dataSource.manager,
		inject: [getDataSourceToken(options)],
	};
}
```

위와 같이 `@nestjs/typeorm` 의존성에서 의도적으로 EntityManager를 주입하는 것을 알 수 있고, 우리가 UserService에서 주입받은 `EntityManager`는 바로 이 `EntityManager` 이다. 그래서 Transaction을 선언할 때, userRepository.save()와 entityManager.transaction(...)의 EntityManager가 달라 별도의 트랜잭션으로 작동하는 것이다. 

본인이 익숙한 SpringBoot 프레임워크에서는 다음과 같이 간단하게 Transaction을 적용할 수 있다.

```java
@Transactional
public User createUser(UserCreateRequest req) {
	User user = userRepository.save(new User(...));
	reutnr User;
}
```

`@Transactional` Annotation을 통해 간단하게 트랜잭션을 적용할 수 있는데, 이는 AOP 라는 개념을 이용하여 만든 것이다. NestJS에서도 Java의 Annotation의 개념과 비슷한 Decorator가 있고, 이를 이용해 AOP를 구현할 수 있다. 

실제로 NodeJS 환경에서 많이 사용되는 [typeorm-transactional]이 있다.

해당 라이브러리를 사용하기 위해서, `main.ts` 에 다음과 같은 코드가 추가되어야 한다.

```ts title=main.ts
...
initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });
...
```

해당 initializeTransactionalContext 에는 우리가 앞서 고민했던 문제의 해결책이 담겨있다. `cls-hooked` 또는 `AsyncLocalStorage` 를 **StorageDriver** 로 선택하여, 해당 영역에 Request Life Cycle 동안 유지되는 데이터를 저장할 수 있다. 그래서 initializeTransactionalContext() 함수에서 각각의 CustomRepository에서 EntityManager에 접근할 때, 새롭게 생성된 EntityManager에 접근하는 것이 아니라, `Storage (Context)` 에서 해당 EntityManager를 가져와서, 쿼리를 처리한다. 

```ts title='typeorm-transaction의 initializeTransactionalContext() 함수'
export const initializeTransactionalContext = (options?: Partial<TypeormTransactionalOptions>) => {
  setTransactionalOptions(options);

  const patchManager = (repositoryType: unknown) => {
    Object.defineProperty(repositoryType, 'manager', {
      configurable: true,
      get() {
        return (
          getEntityManagerInContext(
            this[TYPEORM_ENTITY_MANAGER_NAME].connection[
              TYPEORM_DATA_SOURCE_NAME
            ] as DataSourceName,
          ) || this[TYPEORM_ENTITY_MANAGER_NAME]
        );
      },
      set(manager: EntityManager | undefined) {
        this[TYPEORM_ENTITY_MANAGER_NAME] = manager;
      },
    });
  };

  const getRepository = (originalFn: (args: unknown) => unknown) => {
    return function patchRepository(...args: unknown[]) {
      const repository = originalFn.apply(this, args);

      if (!(TYPEORM_ENTITY_MANAGER_NAME in repository)) {
        /**
         * Store current manager
         */
        repository[TYPEORM_ENTITY_MANAGER_NAME] = repository.manager;
      }

      return repository;
    };
  };

  const originalGetRepository = EntityManager.prototype.getRepository;
  const originalExtend = Repository.prototype.extend;

  EntityManager.prototype.getRepository = getRepository(originalGetRepository);
  Repository.prototype.extend = getRepository(originalExtend);

  patchManager(Repository.prototype);

  const { storageDriver } = getTransactionalOptions();
  return storage.create(storageDriver);
};

```

- `patchManager()` : 파라미터로 주어진 repositoryType의 manager 속성에 대해 접근할 경우, getEntityManagerinContext() 를 통해 manager를 조화하여 가져온다. getEntityMangerInContext() 함수는 cls-hooked, AsyncLocalStorage와 같은 StorageDriver로 구성된 Context에서 저장한 EntityManager를 조회하여 반환한다.
- `getRepository()` : EntityManager의 getRepository() 함수와 Repository의 extend() 함수는 새로운 Repository를가 생성되고, EntityManager를 통해 DB 로직을 처리할 때, Context에 존재하는 EntityManager를 통해 처리하도록 getRepository() 함수를 Wrapping하여, 해당 속성값에 Context에 접근하여 EntityManager를 가져올 수 있도록 수정하는 것이다.

위 과정을 거치게 되면, Repository의 manager 속성에 접근하게 되면`patchManager()` 에 의해 Context에 있는 EntityManager에 접근한다. 

결국 `Context` 라는 공간에 `EntityManager` 가 세팅되어 있어야 모든 일이 가능한 것인데, 어디서 추가할까?

```ts title='wrap-in-transactions.ts'
...
const runWithNewTransaction = () => {
      const transactionCallback = async (entityManager: EntityManager) => {
        setEntityManagerByDataSourceName(context, connectionName, entityManager);

        try {
          const result = await runOriginal();

          return result;
        } finally {
          setEntityManagerByDataSourceName(context, connectionName, null);
        }
      };

      if (isolationLevel) {
        return runInNewHookContext(context, () => {
          return dataSource.transaction(isolationLevel, transactionCallback);
        });
      } else {
        return runInNewHookContext(context, () => {
          return dataSource.transaction(transactionCallback);
        });
      }
    };
...
```

해당 `runWithNewTransaction()` 변수는 `새로운 Transaction 생성` 이 필요할 때, 실행되는 함수를 반환하는 변수이다. 

### @Transactional 만들어보기
---
이런 아이디어를 통해 직접 @Transactional을 만들면 더 좋은 학습이 될 수 있을 거 같아서 만들어 보는 과정을 소개한다. 

우선 Request 별 Context를 유지하기 위해 AsyncLocalStorage를 사용했다. 다음은 이걸 이용한 Context 클래스이다.


우리가 정의한 UserRepository와 같은 CustomRepository는 Repository를  상속받으므로, Prototype을 활용하여, EntityManager를 가져와 사용한다. 

헤맸던 부분, 나는 임의의 EntityManager를 만들어서 `Context`에 저장하여 가져와 사용하는 줄 알았다. 하지만 `typeorm-transactional` 

```ts title='기본적인 Transaction을 사용하는 방법'
...
datasource.transaction(async (manager) => {
	constr user = manager.create(User, request)
	manager.save(user);
	...
});
...
```

위 방법이 가장 큰 힌트였다. 저기서 manager로 주어진 EntityManager를 AsyncLocalStorage에 넣는 것이다. 그렇다면 `@Transactional 데코레이터` 의 구조는 다음과 같다.

```ts title='transactional.decorator.ts'
...
descriptor.value = async function (...args: any[]) {
	const dataSource = context.getDataSource();
	return await dataSource.manager.transaction(async (manager) => {
		return await context.run(new Map([['entityManager', manager]]), async () => {
			return await original.apply(this, args);
		})
	})
}
...
```

임의의 `DataSource` 를 저장한 공간에서, 저장된 `DataSource` 를 가져온다. 해당 DataSource의 EntityManager의 transaction() 함수를 통해 주어진 EntityManager를 AsyncLocalStorage Context에 저장한다. 그리고 본래의 로직을 실행한다. 

이 때, 각각의 Repository는 manager에 접근할 때, 기존 dataSource.createEntityManager() 를 통한 EntityManager에 접근하는 것이 아닌, AsyncLocalStorage의 Context에 접근해야 한다. 그렇기 때문에 Object.defineProperty를 통해 manager 접근 시 Context를 접근하도록 한다.

```ts
import { context } from "src/context"
import { User } from "src/user/user.entity"
import { Repository } from "typeorm"

export function init() {
    Object.defineProperty(Repository.prototype, 'manager', {
        configurable: true,
        get() {
            return context.get('entityManager')
        },
        set() {
					...
        }
    })
    ...
}
```

`Server` 시작 시 해당 로직을 적용해주면 된다. 제대로 만들려면, `Contex`에 대한 정보가 없을 때의 경우나, 여러가지를 생각해서 개발해야겠지만, 지금은 학습 목적으로 작성하기 때문에 디테일한 부분은 넘어가며 진행하도록 하겠다.

그럼 이제 @Transactional 데코레이터를 적용하여 로직을 시험해보도록  하겠다.

```ts title='user.service.ts'
export class UserService {
	constructor() {
		private readonly userRepository: UserRepository;
	}

	@Transactional()
	async createUser(userCreateRequest: UserCreateRequest): Promise<void> {
			await this.userRepository.save(userCreateRequest);
	}
}
```

![[Pasted image 20250604165747.png]]

![[Pasted image 20250604165829.png]]