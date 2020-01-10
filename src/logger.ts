export const logMethod:MethodDecorator = ((target, propertyKey, descriptor:TypedPropertyDescriptor<any>) => {
    let originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log("Called " + propertyKey.toString() + " on " + this + " with params: " + args.map(arg => arg.toString()). join(', '));
        let returned = originalMethod.apply(this, args);
        console.log(propertyKey.toString() + " on " + this + " returned: " + returned);

        return returned;
    }
});