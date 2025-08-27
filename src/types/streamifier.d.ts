declare module 'streamifier' {
    import { Readable } from 'stream';
    
    interface Streamifier {
        createReadStream(buffer: Buffer): Readable;
    }
    
    const streamifier: Streamifier;
    export = streamifier;
}
