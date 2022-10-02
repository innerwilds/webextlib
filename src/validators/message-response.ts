import type { IResponse, Validator } from '../types';
import { Status } from '../const';
import { isObject } from 'underscore';

const messageResponseValidator: Validator<IResponse<any>> = {
	validate(value: IResponse<any>): value is IResponse<any> {
		return isObject(value) && Object.values(Status).includes(value.status);
	},
};

export default messageResponseValidator;
