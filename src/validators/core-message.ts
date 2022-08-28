import { isString } from 'underscore';
import { has } from 'underscore';
import { isObject } from 'underscore';
import {ICoreMessage, Validator} from '../types';

/*
type ICoreMessage<T> = {
	key: string;
	data: T;
};
 */

const coreMessageValidator: Validator<ICoreMessage<any>> = {
	validate(value: ICoreMessage<any>): value is ICoreMessage<any> {
		return isObject(value) && isString(value.key) && has(value, 'data');
	},
};

export default coreMessageValidator;
