import _ from 'lodash';

export const validate = (v: any) => !_.isUndefined(v) && !_.isEmpty(v) && !_.isNull(v)