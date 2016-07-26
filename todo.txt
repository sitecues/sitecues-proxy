// TODO: Define these properties on the server instance state object.
//        - .hostname  // Hostname (no port) used to resolve URLs, as in 'proxy.sitecues.com'
//        - .port      // The intialized, computed port used by the server, as in 8000
//        - .host      // A combination of .hostname + ':' + .port, as in 'proxy.sitecues.com:8000'
//        - .path      // Empty string, or a combination of .contextPath + .pageApiPath (if in reverse mode), as in '/boom/page/'
//        - .contextPath  // An arbitrary mount point for all server routes, as in '/boom/'
//        - .pageApiPath  // Special route dedicated to reverse proxying pages, as in '/page/'
//        - .statusPath   // Special route dedicated to health checks, as in '/status'
//        - .stopping     // Boolean indicating whether the server is in the process of shutting down, but hasn't finished yet
//        - .stopped      // Boolean indicating whether the server has completely shut down and is not accepting connections
//        - .starting     // Boolean indicating whether the server is in the process of starting up, but hasn't finished yet
//        - .started      // Boolean indicating whether the server has completely started up and is accepting connections
//        - .readyState   // Integer used as the basis for .stopping, .stopped, .starting, and .started
