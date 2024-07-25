// -------------------------------------------------------------------------
// Welcome to the sketchbook of our library's type definitions. 
//--------------------------------------------------------------------------
//
// Like a promise of "we'll do it tomorrow," we've sketched out the outlines but the details? 
// Well, they will be defined later... This finger never eats but always says 'I'll pick the tab next time!'
//
// Feel adventurous? Help us fill in the gaps – don't wait for tomorrow!
// -------------------------------------------------------------------------

export class Agent {

    [key: string]: any;

    constructor(props?: Record<string, any>) {
        Object.assign(this, props);
    }    

    // Implementation details will be defined later... 
    // Yes, this is the 'I’ll clean my desk next week' kind of later.
}

export class Task {

    [key: string]: any;

    constructor(props?: Record<string, any>) {
        Object.assign(this, props);
    }    

    // Implementation details will be defined later... 
    // Like that gym membership we all get in January.
}

export class Team {

    [key: string]: any;

    constructor(props?: Record<string, any>) {
        Object.assign(this, props);
    }    

    // Implementation details will be defined later... 
    // We're scheduling a meeting to plan the meeting about this.
}
