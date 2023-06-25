
## Approaches

- Simple Clustering Approach
    - Cluster neighbouring nodes together instead of setting all linkedIds same. 
    - Take only neighbours with matching phone_no or email
    - Advantages
        - Allows for faster POST /identity function (Less write operations)
        - Simplified CRUD operatons
    - Disadvantages
        - Does not provide correct linkedId in a certain edge case. 
    - Conclusion
        - Since edge-cases for failure may be relatively low, this approach would allow for a faster /identity function to solve for most of the cases. 

- Disjoint Set Union Approach
    - Every connected component can be represented by one linkedId (linkedId of the oldest node in the connected component)
    - Advantages
        - Exact linkedId would be provided. Thus, the user who would be running the application can be determined correctly
    - Disadvantages
        - When merging two large connected components, this will require rewriting all the linkedIds of the newer connected-component. (More write operations)
        - Deletion of Contact nodes can be difficult.
    - Conclusion
        - Not a very scalable solution however it would be very accurate.

- Cron-based Approach:
    - Another approach is using a simple table "contactTable" for contacts which include `{ email?,
        phoneNumber? }`.
    - A daily cron-job could be scheduled for grouping together all the common `{ email?,
        phoneNumber? }` pairs and store corresponding linkedIds in a "groupedTable". (This could also be cached)
    - Any new query, could first be checked in the groupedTable and if not found, added to
        the contactTable.
    - Advantages
        - Allows for faster POST /identity function (Less write operations)
        - Simplified CRUD operatons and caching
    - Disadvantages
        - Fails in an edge-case where the same user requests using different contacts in the same
            day (or before the next cron-job is scheduled).

## Author's Note

In the current project, I have used the Disjoint-Set-Union Approach over the simple-clustering-approach as this is the solution which would provide the solution accurately.
In the real-world implementation of this project, the clustering-approach with caching maybe more practical and recommended. 

## Enhancements

- Cache common email and phoneNo. on redis. This way most of the common users can easily be
    tracked.
- SwaggerUI could be integrated the application for simple testing and API documentation.
- `linkedId` could be set with a default value of `contactObj.id`. This could reduce redundant
    checks which are performed in the code.
- Setup database migration capabilities

## Setup

To install from source,
Clone the repo, install the packages using `npm install` and then `npm start` to run the
microservice on `http:localhost:8080`.
