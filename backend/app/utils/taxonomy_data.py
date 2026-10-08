"""
Canonical Skill Taxonomy Data
Curated categories, skills, descriptions, and aliases for deterministic normalization and matching.
"""

CANONICAL_SKILLS = [
    # =========================================================================
    # 1. Programming Languages
    # =========================================================================
    {
        "name": "Python",
        "category": "Programming Languages",
        "description": "High-level, interpreted programming language known for readability, versatile data science, web development, and AI scripting.",
        "aliases": ["python3", "python 3", "python programming", "py"]
    },
    {
        "name": "JavaScript",
        "category": "Programming Languages",
        "description": "High-level interpreted language conforming to ECMAScript, powering client-side web and Node.js server runtimes.",
        "aliases": ["js", "es6", "es6+", "ecmascript", "javascript programming", "vanilla js"]
    },
    {
        "name": "TypeScript",
        "category": "Programming Languages",
        "description": "Statically typed superset of JavaScript that compiles to plain JavaScript.",
        "aliases": ["ts", "typescript programming"]
    },
    {
        "name": "Java",
        "category": "Programming Languages",
        "description": "Class-based, object-oriented language designed for cross-platform portability via the JVM.",
        "aliases": ["java 8", "java 11", "java 17", "java 21", "core java", "j2se", "j2ee"]
    },
    {
        "name": "C++",
        "category": "Programming Languages",
        "description": "General-purpose programming language with low-level memory manipulation and object-oriented features.",
        "aliases": ["cpp", "c plus plus", "c/c++"]
    },
    {
        "name": "C#",
        "category": "Programming Languages",
        "description": "Modern, object-oriented language developed by Microsoft for the .NET platform.",
        "aliases": ["csharp", "c sharp", "c-sharp", "dotnet c#"]
    },
    {
        "name": "Go",
        "category": "Programming Languages",
        "description": "Statically typed, compiled language developed by Google featuring built-in concurrency primitives.",
        "aliases": ["golang", "go language", "go programming"]
    },
    {
        "name": "Rust",
        "category": "Programming Languages",
        "description": "Systems programming language focusing on safety, memory safety without garbage collection, and concurrency.",
        "aliases": ["rustlang", "rust programming"]
    },
    {
        "name": "Ruby",
        "category": "Programming Languages",
        "description": "Dynamic, open-source programming language with a focus on simplicity and productivity.",
        "aliases": ["ruby programming", "ruby lang"]
    },
    {
        "name": "PHP",
        "category": "Programming Languages",
        "description": "Server-side scripting language designed for web development.",
        "aliases": ["php7", "php8", "php programming"]
    },
    {
        "name": "Swift",
        "category": "Programming Languages",
        "description": "Modern, fast, and safe programming language developed by Apple for iOS and macOS development.",
        "aliases": ["swiftlang", "swift programming", "apple swift"]
    },
    {
        "name": "Kotlin",
        "category": "Programming Languages",
        "description": "Modern statically typed programming language that runs on the JVM and is Android's preferred language.",
        "aliases": ["kotlin programming", "kotlin/jvm"]
    },
    {
        "name": "SQL",
        "category": "Programming Languages",
        "description": "Standard language for storing, manipulating and retrieving data in relational databases.",
        "aliases": ["structured query language", "ansi sql", "sql queries"]
    },
    {
        "name": "HTML",
        "category": "Programming Languages",
        "description": "Standard markup language for documents designed to be displayed in a web browser.",
        "aliases": ["html5", "html 5", "hypertext markup language"]
    },
    {
        "name": "CSS",
        "category": "Programming Languages",
        "description": "Style sheet language used for describing the presentation of a document written in HTML.",
        "aliases": ["css3", "css 3", "cascading style sheets"]
    },
    {
        "name": "Bash",
        "category": "Programming Languages",
        "description": "Unix shell and command language for scripting and automating system operations.",
        "aliases": ["bash scripting", "shell scripting", "shell", "sh", "zsh"]
    },
    {
        "name": "R",
        "category": "Programming Languages",
        "description": "Programming language and free software environment for statistical computing and graphics.",
        "aliases": ["r programming", "r-project", "r language"]
    },
    {
        "name": "Scala",
        "category": "Programming Languages",
        "description": "Strongly typed language that combines object-oriented and functional programming paradigms on the JVM.",
        "aliases": ["scala programming"]
    },
    {
        "name": "Dart",
        "category": "Programming Languages",
        "description": "Client-optimized language for fast apps on any platform, powering Flutter.",
        "aliases": ["dart programming", "dartlang"]
    },

    # =========================================================================
    # 2. Frameworks
    # =========================================================================
    {
        "name": "React",
        "category": "Frameworks",
        "description": "Declarative component-based JavaScript library/framework for building user interfaces.",
        "aliases": ["react.js", "reactjs", "react js"]
    },
    {
        "name": "Next.js",
        "category": "Frameworks",
        "description": "React framework for server-side rendering, static site generation, and full-stack web applications.",
        "aliases": ["nextjs", "next js"]
    },
    {
        "name": "Vue.js",
        "category": "Frameworks",
        "description": "Progressive JavaScript framework for building user interfaces and single-page applications.",
        "aliases": ["vue", "vuejs", "vue 3", "vue2"]
    },
    {
        "name": "Angular",
        "category": "Frameworks",
        "description": "TypeScript-based open-source web application framework led by Google.",
        "aliases": ["angularjs", "angular 2+", "angular 12+", "angular framework"]
    },
    {
        "name": "FastAPI",
        "category": "Frameworks",
        "description": "Modern, fast web framework for building APIs with Python 3.8+ based on standard Python type hints.",
        "aliases": ["fast-api", "fastapi framework"]
    },
    {
        "name": "Django",
        "category": "Frameworks",
        "description": "High-level Python web framework that encourages rapid development and clean, pragmatic design.",
        "aliases": ["django framework", "django rest framework", "drf"]
    },
    {
        "name": "Flask",
        "category": "Frameworks",
        "description": "Micro web framework written in Python based on Werkzeug and Jinja2.",
        "aliases": ["flask framework"]
    },
    {
        "name": "Express.js",
        "category": "Frameworks",
        "description": "Fast, unopinionated, minimalist web framework for Node.js.",
        "aliases": ["express", "expressjs", "express js"]
    },
    {
        "name": "NestJS",
        "category": "Frameworks",
        "description": "Progressive Node.js framework for building efficient, reliable and scalable server-side applications.",
        "aliases": ["nest.js", "nestjs framework"]
    },
    {
        "name": "Spring Boot",
        "category": "Frameworks",
        "description": "Java-based framework used to create stand-alone, production-grade Spring-based applications.",
        "aliases": ["springboot", "spring-boot", "spring framework"]
    },
    {
        "name": "ASP.NET Core",
        "category": "Frameworks",
        "description": "Cross-platform, high-performance open-source framework for building modern cloud-enabled applications.",
        "aliases": ["asp.net", "dotnet core", ".net core", "dotnet"]
    },
    {
        "name": "Ruby on Rails",
        "category": "Frameworks",
        "description": "Model-view-controller framework written in Ruby providing default structures for databases and web services.",
        "aliases": ["rails", "ror"]
    },
    {
        "name": "Flutter",
        "category": "Frameworks",
        "description": "Open source UI software development kit created by Google for cross-platform app development.",
        "aliases": ["flutter sdk", "flutter mobile"]
    },
    {
        "name": "React Native",
        "category": "Frameworks",
        "description": "Framework for building native mobile applications using React and JavaScript.",
        "aliases": ["react-native", "reactnative"]
    },
    {
        "name": "Svelte",
        "category": "Frameworks",
        "description": "Compiler-based component framework that converts components into highly efficient vanilla JavaScript.",
        "aliases": ["sveltekit", "svelte.js", "sveltejs"]
    },

    # =========================================================================
    # 3. Libraries
    # =========================================================================
    {
        "name": "Redux",
        "category": "Libraries",
        "description": "Predictable state container for JavaScript apps.",
        "aliases": ["redux toolkit", "rtk", "redux-thunk", "react-redux"]
    },
    {
        "name": "Tailwind CSS",
        "category": "Libraries",
        "description": "Utility-first CSS framework packed with classes for rapid UI development.",
        "aliases": ["tailwindcss", "tailwind"]
    },
    {
        "name": "Bootstrap",
        "category": "Libraries",
        "description": "Popular HTML, CSS, and JS library for developing responsive, mobile-first projects.",
        "aliases": ["bootstrap 5", "bootstrap 4", "twitter bootstrap"]
    },
    {
        "name": "Pandas",
        "category": "Libraries",
        "description": "Fast, powerful, flexible and easy to use open source data analysis and manipulation library for Python.",
        "aliases": ["pandas library", "pd"]
    },
    {
        "name": "NumPy",
        "category": "Libraries",
        "description": "Fundamental package for scientific computing with Python, providing powerful multi-dimensional arrays.",
        "aliases": ["numpy library", "np"]
    },
    {
        "name": "Scikit-Learn",
        "category": "Libraries",
        "description": "Machine learning library for Python featuring various classification, regression and clustering algorithms.",
        "aliases": ["sklearn", "scikit learn", "scikit-learn library"]
    },
    {
        "name": "PyTorch",
        "category": "Libraries",
        "description": "Open source machine learning framework based on the Torch library for deep learning and tensor computation.",
        "aliases": ["torch", "pytorch library"]
    },
    {
        "name": "TensorFlow",
        "category": "Libraries",
        "description": "End-to-end open source platform for machine learning developed by Google.",
        "aliases": ["tf", "tensorflow 2", "tensorflow library"]
    },
    {
        "name": "Keras",
        "category": "Libraries",
        "description": "Deep learning API written in Python, running on top of the machine learning platform TensorFlow.",
        "aliases": ["keras api", "tf.keras"]
    },
    {
        "name": "OpenCV",
        "category": "Libraries",
        "description": "Open source computer vision and machine learning software library.",
        "aliases": ["cv2", "open-cv", "computer vision library"]
    },
    {
        "name": "SQLAlchemy",
        "category": "Libraries",
        "description": "Python SQL toolkit and Object Relational Mapper that gives developers the full power of SQL.",
        "aliases": ["sqlalchemy orm", "sql alchemy"]
    },
    {
        "name": "Axios",
        "category": "Libraries",
        "description": "Promise-based HTTP client for the browser and Node.js.",
        "aliases": ["axios client", "axios library"]
    },

    # =========================================================================
    # 4. Databases
    # =========================================================================
    {
        "name": "PostgreSQL",
        "category": "Databases",
        "description": "Powerful, open source object-relational database system with over 35 years of active development.",
        "aliases": ["postgres", "postgresql database", "psql", "pgsql"]
    },
    {
        "name": "MySQL",
        "category": "Databases",
        "description": "Open-source relational database management system based on SQL.",
        "aliases": ["mysql database", "mysql server"]
    },
    {
        "name": "MongoDB",
        "category": "Databases",
        "description": "Document-oriented NoSQL database program using JSON-like documents with optional schemas.",
        "aliases": ["mongo", "mongodb database", "nosql mongodb"]
    },
    {
        "name": "Redis",
        "category": "Databases",
        "description": "In-memory data structure store used as a database, cache, streaming engine, and message broker.",
        "aliases": ["redis cache", "redis database", "redis in-memory"]
    },
    {
        "name": "SQLite",
        "category": "Databases",
        "description": "C-language library that implements a small, fast, self-contained, high-reliability, full-featured SQL database engine.",
        "aliases": ["sqlite3", "sqlite database"]
    },
    {
        "name": "Cassandra",
        "category": "Databases",
        "description": "Free and open-source, distributed, wide-column store NoSQL database management system.",
        "aliases": ["apache cassandra", "cassandra db"]
    },
    {
        "name": "Amazon DynamoDB",
        "category": "Databases",
        "description": "Fully managed proprietary NoSQL database service that supports key-value and document data structures.",
        "aliases": ["dynamodb", "aws dynamodb", "dynamo db"]
    },
    {
        "name": "Microsoft SQL Server",
        "category": "Databases",
        "description": "Relational database management system developed by Microsoft.",
        "aliases": ["mssql", "sql server", "ms sql"]
    },
    {
        "name": "Oracle Database",
        "category": "Databases",
        "description": "Multi-model database management system produced and marketed by Oracle Corporation.",
        "aliases": ["oracle db", "oracle sql", "oracle 19c"]
    },
    {
        "name": "Elasticsearch",
        "category": "Databases",
        "description": "Distributed, multitenant-capable full-text search engine based on Lucene.",
        "aliases": ["elastic search", "elastic", "elk stack"]
    },

    # =========================================================================
    # 5. Cloud
    # =========================================================================
    {
        "name": "AWS",
        "category": "Cloud",
        "description": "Comprehensive cloud computing platform provided by Amazon including compute, storage, databases, and AI.",
        "aliases": ["amazon web services", "amazon aws", "aws cloud", "ec2", "s3", "lambda", "aws lambda"]
    },
    {
        "name": "Microsoft Azure",
        "category": "Cloud",
        "description": "Cloud computing service operated by Microsoft for application management via Microsoft-managed data centers.",
        "aliases": ["azure", "azure cloud", "ms azure"]
    },
    {
        "name": "Google Cloud Platform",
        "category": "Cloud",
        "description": "Suite of cloud computing services that runs on the same infrastructure that Google uses internally.",
        "aliases": ["gcp", "google cloud", "google cloud platform (gcp)"]
    },
    {
        "name": "Docker",
        "category": "DevOps",
        "description": "Set of platform-as-a-service products that use OS-level virtualization to deliver software in packages called containers.",
        "aliases": ["docker containers", "dockerfile", "docker-compose", "containerization"]
    },
    {
        "name": "Kubernetes",
        "category": "DevOps",
        "description": "Open-source system for automating deployment, scaling, and management of containerized applications.",
        "aliases": ["k8s", "k8", "kubernetes orchestration"]
    },
    {
        "name": "CI/CD",
        "category": "DevOps",
        "description": "Continuous Integration and Continuous Delivery/Deployment practices for automated testing and deployment.",
        "aliases": ["continuous integration", "continuous delivery", "continuous deployment", "ci cd", "cicd"]
    },
    {
        "name": "GitHub Actions",
        "category": "DevOps",
        "description": "Continuous integration and continuous delivery platform that allows you to automate your build, test, and deployment pipeline.",
        "aliases": ["github action", "gh actions"]
    },
    {
        "name": "Jenkins",
        "category": "DevOps",
        "description": "Open source automation server which enables developers around the world to reliably build, test, and deploy their software.",
        "aliases": ["jenkins ci", "jenkins pipeline"]
    },
    {
        "name": "Terraform",
        "category": "DevOps",
        "description": "Open-source infrastructure as code software tool that enables you to safely and predictably create and improve infrastructure.",
        "aliases": ["hashicorp terraform", "iac terraform", "infrastructure as code"]
    },
    {
        "name": "Ansible",
        "category": "DevOps",
        "description": "Open-source software provisioning, configuration management, and application-deployment tool.",
        "aliases": ["ansible automation", "ansible playbooks"]
    },
    {
        "name": "Linux",
        "category": "DevOps",
        "description": "Open-source Unix-like operating system kernel widely used in server environments and cloud infrastructure.",
        "aliases": ["linux administration", "ubuntu", "debian", "centos", "redhat", "rhel"]
    },
    {
        "name": "Nginx",
        "category": "DevOps",
        "description": "Web server that can also be used as a reverse proxy, load balancer, mail proxy and HTTP cache.",
        "aliases": ["nginx server", "nginx reverse proxy"]
    },

    # =========================================================================
    # 6. Tools
    # =========================================================================
    {
        "name": "Git",
        "category": "Tools",
        "description": "Distributed version control system designed to handle everything from small to very large projects with speed and efficiency.",
        "aliases": ["git version control", "git vcs"]
    },
    {
        "name": "GitHub",
        "category": "Tools",
        "description": "Internet hosting service for software development and version control using Git.",
        "aliases": ["github.com"]
    },
    {
        "name": "Postman",
        "category": "Tools",
        "description": "API platform for building and using APIs, streamlining each step of the API lifecycle.",
        "aliases": ["postman api", "postman client"]
    },
    {
        "name": "Jira",
        "category": "Tools",
        "description": "Proprietary issue tracking product that allows bug tracking and agile project management.",
        "aliases": ["atlassian jira", "jira software"]
    },
    {
        "name": "Figma",
        "category": "Tools",
        "description": "Collaborative web application for interface design and wireframing.",
        "aliases": ["figma design", "figma ui"]
    },

    # =========================================================================
    # 7. Data / Analytics
    # =========================================================================
    {
        "name": "Data Analysis",
        "category": "Data/Analytics",
        "description": "Process of inspecting, cleansing, transforming, and modeling data with the goal of discovering useful information.",
        "aliases": ["data analytics", "exploratory data analysis", "eda"]
    },
    {
        "name": "ETL",
        "category": "Data/Analytics",
        "description": "Extract, Transform, Load procedure in computing and database administration.",
        "aliases": ["extract transform load", "data pipeline", "data pipelines", "elt"]
    },
    {
        "name": "Apache Spark",
        "category": "Data/Analytics",
        "description": "Multi-language engine for executing data engineering, data science, and machine learning on single-node machines or clusters.",
        "aliases": ["spark", "pyspark", "apache-spark"]
    },
    {
        "name": "Apache Kafka",
        "category": "Data/Analytics",
        "description": "Distributed event store and stream-processing platform for high-throughput, low-latency streaming data.",
        "aliases": ["kafka", "kafka streaming"]
    },
    {
        "name": "Tableau",
        "category": "Data/Analytics",
        "description": "Interactive data visualization software focused on business intelligence.",
        "aliases": ["tableau desktop", "tableau server"]
    },
    {
        "name": "Power BI",
        "category": "Data/Analytics",
        "description": "Interactive data visualization software developed by Microsoft with a primary focus on business intelligence.",
        "aliases": ["powerbi", "microsoft power bi"]
    },
    {
        "name": "Snowflake",
        "category": "Data/Analytics",
        "description": "Cloud computing-based data cloud company that offers a cloud-based data storage and analytics service.",
        "aliases": ["snowflake data warehouse", "snowflake db"]
    },

    # =========================================================================
    # 8. AI / ML
    # =========================================================================
    {
        "name": "Machine Learning",
        "category": "AI/ML",
        "description": "Study of computer algorithms that can improve automatically through experience and by the use of data.",
        "aliases": ["ml", "supervised learning", "unsupervised learning", "machine learning algorithms"]
    },
    {
        "name": "Deep Learning",
        "category": "AI/ML",
        "description": "Part of a broader family of machine learning methods based on artificial neural networks with representation learning.",
        "aliases": ["neural networks", "ann", "cnn", "rnn", "deep neural networks"]
    },
    {
        "name": "Natural Language Processing",
        "category": "AI/ML",
        "description": "Subfield of computer science and artificial intelligence concerned with interactions between computers and human languages.",
        "aliases": ["nlp", "text mining", "text processing", "computational linguistics"]
    },
    {
        "name": "Computer Vision",
        "category": "AI/ML",
        "description": "Interdisciplinary scientific field that deals with how computers can gain high-level understanding from digital images or videos.",
        "aliases": ["image processing", "object detection", "image classification"]
    },
    {
        "name": "Large Language Models",
        "category": "AI/ML",
        "description": "Language models consisting of neural networks with billions of parameters trained on vast amounts of unlabelled text.",
        "aliases": ["llm", "llms", "gpt", "foundation models"]
    },
    {
        "name": "Generative AI",
        "category": "AI/ML",
        "description": "Artificial intelligence capable of generating text, images, or other media using generative models.",
        "aliases": ["genai", "gen ai"]
    },
    {
        "name": "Retrieval-Augmented Generation",
        "category": "AI/ML",
        "description": "Architecture that optimizes the output of an LLM by referencing an authoritative knowledge base outside of its training data.",
        "aliases": ["rag", "retrieval augmented generation", "vector search"]
    },
    {
        "name": "Prompt Engineering",
        "category": "AI/ML",
        "description": "Technique of structuring text that can be interpreted and understood by a generative AI model.",
        "aliases": ["prompt design", "prompting"]
    },
    {
        "name": "LangChain",
        "category": "AI/ML",
        "description": "Open source framework that lets software developers working with AI combine LLMs with external data.",
        "aliases": ["langchain framework"]
    },

    # =========================================================================
    # 9. Cybersecurity
    # =========================================================================
    {
        "name": "Information Security",
        "category": "Cybersecurity",
        "description": "Practice of protecting information by mitigating information risks such as unauthorized access.",
        "aliases": ["infosec", "cyber security", "cybersecurity", "security"]
    },
    {
        "name": "Penetration Testing",
        "category": "Cybersecurity",
        "description": "Authorized simulated cyberattack on a computer system, performed to evaluate the security of the system.",
        "aliases": ["pen testing", "ethical hacking", "vulnerability assessment"]
    },
    {
        "name": "OWASP",
        "category": "Cybersecurity",
        "description": "Open Worldwide Application Security Project standards, including OWASP Top 10 web vulnerabilities.",
        "aliases": ["owasp top 10", "web application security"]
    },
    {
        "name": "Cryptography",
        "category": "Cybersecurity",
        "description": "Practice and study of techniques for secure communication in the presence of adversarial third parties.",
        "aliases": ["encryption", "aes", "rsa", "tls/ssl", "pki"]
    },

    # =========================================================================
    # 10. Domain Skills / Software Engineering
    # =========================================================================
    {
        "name": "RESTful APIs",
        "category": "Domain Skills",
        "description": "Architectural style for an application programming interface that uses HTTP requests to access and use data.",
        "aliases": ["rest api", "restful api", "rest", "rest apis", "web apis"]
    },
    {
        "name": "GraphQL",
        "category": "Domain Skills",
        "description": "Open-source data query and manipulation language for APIs, and a runtime for fulfilling queries with existing data.",
        "aliases": ["graphql api", "apollo graphql"]
    },
    {
        "name": "Microservices",
        "category": "Domain Skills",
        "description": "Architectural and organizational approach to software development where software is composed of small independent services.",
        "aliases": ["microservices architecture", "micro-services", "service-oriented architecture"]
    },
    {
        "name": "System Design",
        "category": "Domain Skills",
        "description": "Process of defining the architecture, components, modules, interfaces, and data for a system to satisfy specified requirements.",
        "aliases": ["distributed systems design", "high level design", "low level design"]
    },
    {
        "name": "Object-Oriented Programming",
        "category": "Domain Skills",
        "description": "Programming paradigm based on the concept of objects, which can contain data and code.",
        "aliases": ["oop", "object oriented design", "ood", "solid principles"]
    },
    {
        "name": "Agile Methodology",
        "category": "Domain Skills",
        "description": "Iterative approach to project management and software development that helps teams deliver value faster.",
        "aliases": ["agile", "scrum", "kanban", "sprint planning"]
    },
    {
        "name": "Test-Driven Development",
        "category": "Domain Skills",
        "description": "Software development process relying on software requirements being converted to test cases before software is developed.",
        "aliases": ["tdd", "unit testing", "automated testing", "integration testing"]
    },

    # =========================================================================
    # 11. Soft Skills
    # =========================================================================
    {
        "name": "Problem Solving",
        "category": "Soft Skills",
        "description": "Ability to identify complex problems and review related information to develop and evaluate options and implement solutions.",
        "aliases": ["analytical thinking", "analytical skills", "troubleshooting"]
    },
    {
        "name": "Team Collaboration",
        "category": "Soft Skills",
        "description": "Working cooperatively with others to achieve shared goals and cultivate productive work relationships.",
        "aliases": ["teamwork", "cross-functional collaboration", "collaborative"]
    },
    {
        "name": "Communication",
        "category": "Soft Skills",
        "description": "Ability to convey information to others effectively and efficiently both orally and in writing.",
        "aliases": ["verbal communication", "written communication", "interpersonal skills"]
    },
    {
        "name": "Leadership",
        "category": "Soft Skills",
        "description": "Guiding, inspiring, and directing individuals or teams toward organizational goals.",
        "aliases": ["team leadership", "mentorship", "people management", "mentoring"]
    },
    {
        "name": "Time Management",
        "category": "Soft Skills",
        "description": "Process of planning and exercising conscious control of time spent on specific activities.",
        "aliases": ["prioritization", "multitasking", "deadline management"]
    },
    {
        "name": "Critical Thinking",
        "category": "Soft Skills",
        "description": "Analysis of available facts, evidence, observations, and arguments to form a reasoned judgment.",
        "aliases": ["decision making", "strategic thinking"]
    }
]
