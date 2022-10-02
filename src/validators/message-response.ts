import type { IResponse, Validator } from '../types';
import { Status } from '../const';
import { inEnum, isObject } from '../utils';

const messageResponseValidator: Validator<IResponse<any>> = {
	validate(value: IResponse<any>): value is IResponse<any> {
		return isObject(value) && inEnum(Status, value.status);
	},
};

export default messageResponseValidator;
