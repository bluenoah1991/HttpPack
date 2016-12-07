import request from 'request';

export const DefaultRequestOpts = {
    method: 'POST',
    url: 'http://www.example.com/',
    forever: true,
    timeout: 60 * 1000,
    gzip: true,
    encoding: null
};

export function Request(opts, callback){
    return request(opts, function(error, response, body){
        if (response.statusCode >= 200 && response.statusCode < 300) {
            callback(error, response, body);
        } else {
            var err = new Error(response.statusText);
            callback(error, response, null);
        }
    });
}