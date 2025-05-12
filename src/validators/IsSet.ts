import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsSet(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isArrayUnique",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any[], _: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          const uniqueItems = new Set(value);
          return uniqueItems.size === value.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only unique elements`;
        },
      },
    });
  };
}
