import { ICoreMessage, Validator } from '../types';
import { has, isObject, isString } from '../utils';

const coreMessageValidator: Validator<ICoreMessage<any>> = {
	validate(value: ICoreMessage<any>): value is ICoreMessage<any> {
		return isObject(value) && isString(value.key) && 
			has(value, 'data');
	},
};

export default coreMessageValidator;