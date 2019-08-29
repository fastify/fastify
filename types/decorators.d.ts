import { RouteShorthandOptions } from './route'

export function Get(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Post(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Put(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Delete(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Head(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Options(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function All(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Patch(url: string, options?: RouteShorthandOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function Hook(name: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
export function DecorateInstance(options?: string | {name: string}): (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void
export function DecorateRequest(options?: string | {name: string}): (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void
export function DecorateReply(options?: string | {name: string}): (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void
