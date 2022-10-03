# Документация

Библиотека различных классов, пространств имен и функций позволяющих легко писать расширения для **Firefox**.

Экспортирует:

1. **Status**. Используется для поддержки Message.
2. **Message**. Используется для обменна сообщениями между разными средами.
3. **EnvironmentType**. Список типов сред.
4. **CurrentEnvironment**. Тип нынешней среды.
5. **IRequest** and **IResponse**. Для typescript.

## namespace Tabs
____

**execute** - исполняет код во вкладке. Дополнительно встраивает метод $$$return в код для возврата значения  из кода (единожды).

## class Message
____

Создаёт типизированный объект с ключом, по которому можно обмениваться сообщениями.
Например:

```js
// messages.ts

import {Message} from "webextlib"

// Первый генерик - что отправляем, второй - что получаем.
const productStream = new Message<string, Product[]>("product");

export {
    productStream
}
```

```js
// background.ts
import {Status} from "webextlib";
import {productStream} from "./messages"

function listenToProducts(data: string, req: IRequest<Product[]>) {
    if (data === 'get-products') {
        req.sendResponse([...]);
    }
    else {
        req.sendStatus(Status.Bad);
    }
}

productStream.subscribe(listenToProducts)

// отключаемся
productStream.unsubscribe(listenToProducts)

```

```js
// popup.ts

import {productStream} from "./messages"

const products = await productStream.sendMessage('get-products');

```

## namespace Environment
____
**CurrentEnvironment** - константа указывающая в какой среде в данный момент исполняется код. Является значением перечисления EnvironmentType.
**EnvironmentType** - перечисление типов сред: Background, Popup, Tab.

## Тестирование

Для тестирования нужно запустить test (со сборкой) или test:firefox (без сборки),
далее откроется Firefox с флагами отладки, далее нужно перейти к about:debugging, 
открыть консоль расширения, нажать на Popup расширения и следить за выводом консоли.
Пока есть 4 теста, соответсвенно 4 вывода.