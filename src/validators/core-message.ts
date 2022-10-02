import { isString, has, isObject } from 'underscore';
import { ICoreMessage, Validator } from '../types';

const coreMessageValidator: Validator<ICoreMessage<any>> = {
	validate(value: ICoreMessage<any>): value is ICoreMessage<any> {
		return isObject(value) && isString(value.key) && has(value, 'data');
	},
};

export default coreMessageValidator;
